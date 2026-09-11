/** Format digits with thousand separators for numeric text inputs. */
export function formatNumberInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ko-KR');
}

export function parseNumberInput(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

export function formatNumberValue(value: number): string {
  return value.toLocaleString('ko-KR');
}

/** Compact counts for feed action icons (e.g. 383, 3.2만). */
export function formatCompactCount(value: number): string {
  if (value < 10_000) return value.toLocaleString('ko-KR');
  const man = value / 10_000;
  const rounded = Math.round(man * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}만` : `${rounded.toFixed(1).replace(/\.0$/, '')}만`;
}
