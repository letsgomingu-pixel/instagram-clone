export const ORIGIN_OPTIONS = [
  { value: 'domestic', label: '국내산' },
  { value: 'china', label: '중국산' },
  { value: 'russia', label: '러시아산' },
  { value: 'norway', label: '노르웨이산' },
  { value: 'vietnam', label: '베트남산' },
  { value: 'japan', label: '일본산' },
  { value: 'peru', label: '페루산' },
  { value: 'chile', label: '칠레산' },
  { value: 'usa', label: '미국산' },
  { value: 'other', label: '기타' },
] as const;

export type ProductOrigin = (typeof ORIGIN_OPTIONS)[number]['value'];

export const ORIGIN_LABELS: Record<ProductOrigin, string> = Object.fromEntries(
  ORIGIN_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ProductOrigin, string>;
