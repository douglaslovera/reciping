export function parseDecimalInput(value: string): number | null {
  const compact = value.trim().replace(/\s/g, '');
  if (!compact || !/^[0-9.,]+$/.test(compact)) return null;

  const dots = [...compact.matchAll(/\./g)].map((match) => match.index);
  const commas = [...compact.matchAll(/,/g)].map((match) => match.index);
  if (dots.length > 1 || commas.length > 1) return null;

  const decimalIndex = Math.max(dots[0] ?? -1, commas[0] ?? -1);
  const integerPart = (
    decimalIndex === -1 ? compact : compact.slice(0, decimalIndex)
  ).replace(/[.,]/g, '');
  const fractionPart =
    decimalIndex === -1 ? '' : compact.slice(decimalIndex + 1).replace(/[.,]/g, '');

  if (!integerPart && !fractionPart) return null;
  const normalized = decimalIndex === -1
    ? integerPart
    : `${integerPart || '0'}.${fractionPart || '0'}`;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
