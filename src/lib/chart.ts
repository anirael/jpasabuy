// Small pure helpers for the dashboard charts (kept dependency-free so they are easy to test).

/** Round "nice" tick values that cover [min, max] (always includes 0 when the data straddles or touches it). */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (min === max) {
    if (max === 0) return [0, 1];
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  const span = max - min;
  const rough = span / target;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  const step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10) * pow;
  const first = Math.floor(min / step) * step;
  const last = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = first; v <= last + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** Whole-peso compact label for axes: 750 -> "₱750", 12500 -> "₱12.5K", 1200000 -> "₱1.2M". Input is pesos. */
export function compactPHP(pesos: number): string {
  const sign = pesos < 0 ? "-" : "";
  const a = Math.abs(pesos);
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, "");
  if (a >= 1_000_000) return `${sign}₱${trim(a / 1_000_000)}M`;
  if (a >= 1_000) return `${sign}₱${trim(a / 1_000)}K`;
  return `${sign}₱${Math.round(a)}`;
}

export type Bucket = "day" | "month" | "year";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** period is "YYYY-MM-DD" (first day of the bucket). */
export function formatPeriod(period: string, bucket: Bucket, long = false): string {
  const [y, m, d] = period.split("-").map(Number);
  if (bucket === "year") return String(y);
  if (bucket === "month") return `${MONTHS[m - 1]} ${y}`;
  return long ? `${MONTHS[m - 1]} ${d}, ${y}` : `${MONTHS[m - 1]} ${d}`;
}

/** Indexes of up to `max` evenly spread labels, always including first and last. */
export function labelIndexes(n: number, max: number): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const out = new Set<number>();
  for (let i = 0; i < max; i++) out.add(Math.round((i * (n - 1)) / (max - 1)));
  return [...out];
}
