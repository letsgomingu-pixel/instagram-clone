import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api/v1' : 'http://localhost:8000/api/v1');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/** Let the browser set multipart boundaries; axios defaults break file uploads. */
export function prepareMultipartRequest(config: InternalAxiosRequestConfig) {
  if (!(config.data instanceof FormData)) return config;

  const headers = config.headers;
  if (headers && typeof headers.set === 'function') {
    headers.set('Content-Type', false as unknown as string);
    headers.delete('content-type');
  } else if (headers) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  return config;
}

export function clearAuthSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  window.dispatchEvent(new CustomEvent('auth:session-expired'));
}

function isAuthEndpoint(url: string) {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/me')
  );
}

function isOptionalPublicEndpoint(url: string) {
  return url.includes('/users/suggested');
}

function isPublicAuthPath(pathname: string) {
  return pathname === '/login' || pathname === '/signup' || pathname.startsWith('/admin/login');
}

let handlingSessionExpiry = false;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return prepareMultipartRequest(config);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = String(error.config?.url ?? '');

      if (
        !isAuthEndpoint(requestUrl) &&
        !isOptionalPublicEndpoint(requestUrl) &&
        !handlingSessionExpiry
      ) {
        handlingSessionExpiry = true;
        clearAuthSession();

        const path = window.location.pathname;
        if (!isPublicAuthPath(path)) {
          window.location.replace('/login');
        } else {
          handlingSessionExpiry = false;
        }
      }
    }
    return Promise.reject(error);
  },
);
