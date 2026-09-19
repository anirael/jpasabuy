"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compactPHP, formatPeriod, labelIndexes, niceTicks, type Bucket } from "@/lib/chart";
import { decimalToCentavos, formatPHP } from "@/lib/money";

export type ProfitPoint = { period: string; profit: string; sales: string };

const M = { top: 22, right: 28, bottom: 30, left: 58 };

/** Single-series profit line (one hue, 2px line, 10% wash, end dot with a surface ring) with a crosshair tooltip and a table view. */
export function ProfitLine({ points, bucket }: { points: ProfitPoint[]; bucket: Bucket }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  // Render at real pixel width so axis text stays a readable size on phones.
  const [W, setW] = useState(720);
  const H = W < 480 ? 240 : 280;
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    setW(Math.max(280, Math.round(el.getBoundingClientRect().width)));
    return () => ro.disconnect();
  }, [table]);

  const data = useMemo(
    () => points.map((p) => ({ ...p, profitC: decimalToCentavos(p.profit), salesC: decimalToCentavos(p.sales) })),
    [points],
  );

  const values = data.map((d) => d.profitC / 100);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values), 4);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (i: number) => M.left + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin || 1)) * ih;
  const zeroY = y(0);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(d.profitC / 100).toFixed(1)}`).join(" ");
  const area = data.length > 1 ? `${line} L${x(data.length - 1).toFixed(1)} ${zeroY.toFixed(1)} L${x(0).toFixed(1)} ${zeroY.toFixed(1)} Z` : "";
  const xLabels = labelIndexes(data.length, Math.max(2, Math.floor(iw / (bucket === "year" ? 56 : bucket === "month" ? 84 : 66))));
  const lastIdx = data.length - 1;
  const hasProfit = data.some((d) => d.profitC !== 0);

  function indexFromPointer(clientX: number) {
    const el = wrap.current;
    if (!el || data.length === 0) return null;
    const rect = el.getBoundingClientRect();
    const svgX = clientX - rect.left;
    const t = (svgX - M.left) / iw;
    return Math.min(data.length - 1, Math.max(0, Math.round(t * (data.length - 1))));
  }

  const h = hover === null ? null : data[hover];
  const tipLeft = hover === null ? 0 : (x(hover) / W) * 100;

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" onClick={() => setTable((t) => !t)} aria-pressed={table} className="rounded-full px-3 py-1 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-ink">
          {table ? "Show chart" : "View as table"}
        </button>
      </div>

      {table ? (
        <div className="max-h-[300px] overflow-auto rounded-xl border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-neutral-100 text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">{bucket === "day" ? "Day" : bucket === "month" ? "Month" : "Year"}</th>
                <th className="px-4 py-2.5 text-right font-medium">Sales</th>
                <th className="px-4 py-2.5 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.map((d) => (
                <tr key={d.period}>
                  <td className="px-4 py-2">{formatPeriod(d.period, bucket, true)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatPHP(d.salesC)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatPHP(d.profitC)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={wrap}
          className="relative touch-pan-y select-none focus:outline-none"
          tabIndex={0}
          role="img"
          aria-label={`Profit per ${bucket}, ${data.length} points. Use left and right arrow keys to read values.`}
          onPointerMove={(e) => setHover(indexFromPointer(e.clientX))}
          onPointerLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((h0) => Math.min(data.length - 1, (h0 ?? -1) + 1));
            else if (e.key === "ArrowLeft") setHover((h0) => Math.max(0, (h0 ?? data.length) - 1));
            else if (e.key === "Escape") setHover(null);
          }}
        >
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full">
            {/* recessive hairline grid + y labels */}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} strokeWidth={1} className={t === 0 ? "stroke-neutral-300" : "stroke-neutral-200"} />
                <text x={M.left - 10} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-neutral-500" fontSize="11">
                  {compactPHP(t)}
                </text>
              </g>
            ))}
            {xLabels.map((i) => (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                textAnchor={i === 0 && data.length > 1 ? "start" : i === lastIdx && data.length > 1 ? "end" : "middle"}
                className="fill-neutral-500"
                fontSize="11"
              >
                {formatPeriod(data[i].period, bucket)}
              </text>
            ))}

            {area && <path d={area} style={{ fill: "rgb(var(--chart-line))", opacity: 0.1 }} />}
            {data.length > 1 && <path d={line} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "rgb(var(--chart-line))" }} />}

            {/* crosshair */}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={H - M.bottom} strokeWidth={1} className="stroke-neutral-400" />}

            {/* end dot (or hovered dot) with a 2px surface ring; direct label on the last value */}
            {data.length > 0 &&
              [hover ?? lastIdx].map((i) => (
                <circle key="dot" cx={x(i)} cy={y(data[i].profitC / 100)} r={4.5} strokeWidth={2} className="stroke-white" style={{ fill: "rgb(var(--chart-line))" }} />
              ))}
            {hover === null && data.length > 0 && hasProfit && (
              <text x={x(lastIdx)} y={y(data[lastIdx].profitC / 100) - 12} textAnchor={data.length > 1 ? "end" : "middle"} fontSize="12" fontWeight={600} className="fill-ink">
                {compactPHP(data[lastIdx].profitC / 100)}
              </text>
            )}
          </svg>

          {!hasProfit && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-sm text-neutral-500">No delivered items in this period.</div>
          )}

          {h && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-[150px] -translate-x-1/2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-lg"
              style={{ left: `clamp(80px, ${tipLeft}%, calc(100% - 80px))` }}
              role="status"
            >
              <p className="text-xs text-neutral-500">{formatPeriod(h.period, bucket, true)}</p>
              <p className="mt-1 flex items-center gap-2">
                <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: "rgb(var(--chart-line))" }} aria-hidden="true" />
                <span className="font-display text-base font-semibold">{formatPHP(h.profitC)}</span>
                <span className="text-xs text-neutral-500">profit</span>
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">Sales {formatPHP(h.salesC)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
