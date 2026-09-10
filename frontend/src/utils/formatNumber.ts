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
