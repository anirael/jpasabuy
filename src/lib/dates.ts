const TZ = "Asia/Manila"; // UTC+8, no DST
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function todayYMD(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidYMD(v: string | undefined | null): v is string {
  if (!v || !YMD.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Resolve ?from&to into a safe inclusive range (default: last 30 days incl. today). */
export function resolveRange(from?: string, to?: string): { from: string; to: string } {
  const today = todayYMD();
  let f = isValidYMD(from) ? from : addDays(today, -29);
  let t = isValidYMD(to) ? to : today;
  if (f > t) [f, t] = [t, f];
  if (f < addDays(t, -3650)) f = addDays(t, -3650); // cap at ~10 years
  return { from: f, to: t };
}

export function rangeToTimestamps(r: { from: string; to: string }) {
  return { p_from: `${r.from}T00:00:00+08:00`, p_to: `${r.to}T23:59:59.999+08:00` };
}

export function formatYMD(ymd: string): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}
