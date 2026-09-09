const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export function getCallWebSocketUrl(): string {
  const token = localStorage.getItem('token') ?? '';
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (base && /^https?:\/\//.test(base)) {
    const url = new URL('/ws/calls', base.endsWith('/') ? base : `${base}/`);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('token', token);
    return url.toString();
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/v1/ws/calls?token=${encodeURIComponent(token)}`;
}

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

export async function getCallMedia(withVideo: boolean): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: withVideo ? { facingMode: 'user' } : false,
  });
}
