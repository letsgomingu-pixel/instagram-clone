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
    if (/unsupported media type/i.test(detail)) {
      return '지원하지 않는 파일 형식입니다. JPG, PNG, MP4, MOV로 올려 주세요.';
    }
    if (/invalid image file/i.test(detail)) {
      return '사진을 읽을 수 없습니다. JPG 또는 PNG로 다시 올려 주세요.';
    }
    if (/heic|heif/i.test(detail)) {
      return 'HEIC 사진은 JPG로 변환한 뒤 올려 주세요.';
    }
    if (/file exceeds/i.test(detail)) {
      return '사진 용량이 너무 큽니다. 더 작은 파일로 올려 주세요.';
    }
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
