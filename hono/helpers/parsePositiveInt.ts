export function parsePositiveInt(value: unknown): number | null {
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isInteger(num) || num <= 0) return null;
  return num;
}
