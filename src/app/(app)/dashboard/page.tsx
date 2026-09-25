import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatYMD, rangeToTimestamps, resolveRange, todayYMD } from "@/lib/dates";
import { decimalToCentavos, formatPHP, formatPHPDecimal } from "@/lib/money";
import type { Bucket } from "@/lib/chart";
import { ProfitLine, type ProfitPoint } from "@/components/charts/ProfitLine";
import { StatusDonut } from "@/components/charts/StatusDonut";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Dashboard" };

type Stats = { total_delivered: number; total_sales: string; total_profit: string; new_clients: number };
type Charts = { status: { SECURED: number; JP_ADDRESS: number; ONHAND: number; DELIVERED: number }; series: ProfitPoint[] };

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "month", label: "Monthly" },
  { key: "year", label: "Yearly" },
];

function Stat({ label, value, hint, accent = false }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "border-accent/30 bg-accent-soft" : "border-neutral-200 bg-white"}`}>
      <p className="font-display text-sm text-neutral-500">{label}</p>
      <p className={`mt-2 font-display text-3xl font-semibold tracking-tight ${accent ? "text-accent-dark" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; by?: string }> }) {
  const sp = await searchParams;
  const range = resolveRange(sp.from, sp.to);
  const bucket: Bucket = BUCKETS.some((b) => b.key === sp.by) ? (sp.by as Bucket) : "day";
  const today = todayYMD();
  const ts = rangeToTimestamps(range);

  const supabase = await createClient();
  // The role is only a gate, so the queries start with the check instead of after it (RLS already stops non-owners; requireOwner() still redirects them).
  const [profile, statsRes, chartsRes] = await Promise.all([
    requireOwner(),
    supabase.rpc("dashboard_stats", ts),
    supabase.rpc("dashboard_charts", { ...ts, p_bucket: bucket }),
  ]);
  const stats = statsRes.data as Stats | null;
  const charts = chartsRes.data as Charts | null;

  const presets = [
    { label: "Last 7 days", from: addDays(today, -6), to: today },
    { label: "Last 30 days", from: addDays(today, -29), to: today },
    { label: "Last 90 days", from: addDays(today, -89), to: today },
    { label: "This month", from: `${today.slice(0, 8)}01`, to: today },
    { label: "Last 12 months", from: addDays(today, -364), to: today },
  ];

  // Switching to Monthly/Yearly widens a too-short range so the line has something to draw.
  const days = Math.round((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000) + 1;
  const bucketHref = (b: Bucket) => {
    let { from, to } = range;
    if (b === "month" && days < 90) from = addDays(to, -364);
    if (b === "year" && days < 730) from = addDays(to, -1824);
    return `/dashboard?from=${from}&to=${to}&by=${b}`;
  };

  const profitTotal = charts ? charts.series.reduce((a, p) => a + decimalToCentavos(p.profit), 0) : 0;

  return (
    <>
      <PageHeader
        welcome
        title={`Welcome Back, ${profile.name.split(" ")[0]}!`}
        subtitle="Here's how your pasabuy business is doing."
        userName={profile.name}
        search={{ action: "/inventory", placeholder: "Customer, item, notes…" }}
      />

      {/* One filter row above everything it scopes */}
      <section aria-label="Filters" className="card mb-6 p-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = p.from === range.from && p.to === range.to;
            return (
              <Link
                key={p.label}
                href={`/dashboard?from=${p.from}&to=${p.to}&by=${bucket}`}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  active ? "bg-accent text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
        <form className="mt-3 flex flex-wrap items-end gap-3" method="get">
          <input type="hidden" name="by" value={bucket} />
          <div>
            <label htmlFor="from" className="label">
              From
            </label>
            <input id="from" name="from" type="date" defaultValue={range.from} max={today} className="field" />
          </div>
          <div>
            <label htmlFor="to" className="label">
              To
            </label>
            <input id="to" name="to" type="date" defaultValue={range.to} max={today} className="field" />
          </div>
          <button type="submit" className="btn-secondary">
            Apply
          </button>
        </form>
      </section>

      {statsRes.error || !stats ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load the stats. Please refresh and try again.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-neutral-500">
            {formatYMD(range.from)} – {formatYMD(range.to)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Stat label="Total Delivered" value={String(stats.total_delivered)} hint="Items marked Delivered in this period" />
            <Stat label="Total Sales" value={formatPHPDecimal(stats.total_sales)} hint="Sum of total price of delivered items" accent />
            <Stat label="New Clients" value={String(stats.new_clients)} hint="Customers added in this period" />
          </div>
        </>
      )}

      {chartsRes.error || !charts ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load the charts. If you just updated the app, make sure the latest database migration has been applied.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <section aria-labelledby="status-title" className="card p-5">
            <h2 id="status-title" className="font-display text-base font-semibold">
              Order status
            </h2>
            <p className="mb-4 mt-0.5 text-xs text-neutral-500">All items right now</p>
            <StatusDonut
              slices={[
                { key: "SECURED", label: "Secured", count: charts.status.SECURED },
                { key: "JP_ADDRESS", label: "Japan Address", count: charts.status.JP_ADDRESS },
                { key: "ONHAND", label: "Onhand", count: charts.status.ONHAND },
                { key: "DELIVERED", label: "Delivered", count: charts.status.DELIVERED },
              ]}
            />
          </section>

          <section aria-labelledby="profit-title" className="card min-w-0 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="profit-title" className="font-display text-base font-semibold">
                  Profit
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {formatPHP(profitTotal)} from delivered items · {formatYMD(range.from)} – {formatYMD(range.to)}
                </p>
              </div>
              <div role="group" aria-label="Group profit by" className="flex rounded-full bg-neutral-100 p-1">
                {BUCKETS.map((b) => (
                  <Link
                    key={b.key}
                    href={bucketHref(b.key)}
                    aria-current={b.key === bucket ? "true" : undefined}
                    className={`rounded-full px-3.5 py-1 text-sm font-medium transition ${
                      b.key === bucket ? "bg-white text-ink shadow-sm" : "text-neutral-500 hover:text-ink"
                    }`}
                  >
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <ProfitLine points={charts.series} bucket={bucket} />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
