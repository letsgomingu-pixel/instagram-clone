export const CARRIERS = [
  { id: 'cj', label: 'CJ대한통운' },
  { id: 'hanjin', label: '한진택배' },
  { id: 'lotte', label: '롯데택배' },
  { id: 'epost', label: '우체국택배' },
  { id: 'logen', label: '로젠택배' },
  { id: 'kdexp', label: '경동택배' },
  { id: 'daesin', label: '대신택배' },
] as const;

export function carrierLabel(id: string | null | undefined): string {
  return CARRIERS.find((carrier) => carrier.id === id)?.label || '';
}

export function trackingSearchUrl(carrier: string | null | undefined, trackingNumber: string): string {
  const label = carrierLabel(carrier);
  const query = label ? `${label} ${trackingNumber}` : trackingNumber;
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
}
