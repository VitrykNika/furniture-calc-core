export function toNumber(val) {
  if (val === null || val === undefined) return NaN;
  const s = String(val).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}

export function money(n) {
  return round2(n).toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
