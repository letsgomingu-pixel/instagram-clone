import axios from 'axios';

export function formatApiError(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) {
    return fallback;
  }

  const status = err.response?.status;
  const detail = err.response?.data?.detail;

  if (status === 413) {
    return '동영상 용량이 서버 업로드 제한을 초과했습니다.';
  }
  if (status === 401) {
    return '로그인이 필요합니다. 다시 로그인해 주세요.';
  }
  if (status === 502 || status === 504) {
    return '서버 업로드 처리 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg);
        }
        return '';
      })
      .filter(Boolean);
    if (messages.length) return messages.join(', ');
  }
  if (!err.response) {
    return '네트워크 오류로 업로드에 실패했습니다.';
  }
  return status ? `${fallback} (HTTP ${status})` : fallback;
}
