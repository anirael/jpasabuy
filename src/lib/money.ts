// Money helpers. JPY prices are whole yen and rates have 2 decimals, so
// jpPrice * rate is exact when computed in integer centavos (no float drift).

export const RATE_OPTIONS = Array.from({ length: 11 }, (_, i) => (40 + i) / 100); // 0.40 … 0.50

/** "0.42" | 0.42 -> 42 (hundredths). Returns null when not a valid option. */
export function rateToHundredths(rate: string | number | null | undefined): number | null {
  if (rate === null || rate === undefined || rate === "") return null;
  const n = Math.round(Number(rate) * 100);
  return Number.isFinite(n) && n >= 40 && n <= 50 ? n : null;
}

export function formatRate(rate: string | number | null | undefined): string {
  if (rate === null || rate === undefined || rate === "") return "—";
  return Number(rate).toFixed(2);
}

/** jpPrice (whole yen) × rate (hundredths) -> centavos (integer). */
export function toCentavos(jpPrice: number, rateHundredths: number): number {
  return jpPrice * rateHundredths;
}

/** Parse a decimal string/number from the DB into integer centavos without float error. */
export function decimalToCentavos(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  return Math.round(Number(value) * 100);
}

export function formatPHP(centavos: number): string {
  const sign = centavos < 0 ? "-" : "";
  const abs = Math.abs(Math.round(centavos));
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}₱${whole}.${(abs % 100).toString().padStart(2, "0")}`;
}

/** Format a DB decimal (string or number) as PHP with 2 decimals. */
export function formatPHPDecimal(value: string | number | null | undefined): string {
  return formatPHP(decimalToCentavos(value));
}

export function formatJPY(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return `¥${Math.round(Number(value)).toLocaleString("en-US")}`;
}

export function calc(jpPrice: number | null, rate: string | number | null, pasabuyerRate: string | number | null) {
  const r = rateToHundredths(rate);
  const p = rateToHundredths(pasabuyerRate);
  if (!jpPrice || !Number.isInteger(jpPrice) || jpPrice <= 0) return { total: null, cost: null, profit: null };
  const total = r === null ? null : toCentavos(jpPrice, r);
  const cost = p === null ? null : toCentavos(jpPrice, p);
  return { total, cost, profit: total !== null && cost !== null ? total - cost : null };
}
