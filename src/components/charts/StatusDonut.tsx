"use client";

import { useState } from "react";

export type StatusSlice = { key: string; label: string; count: number };

// light -> dark = earlier -> later pipeline stage; the first (Secured) is a tint of the lightest theme step
const RAMP = ["color-mix(in srgb, rgb(var(--ord-1)) 45%, white)", "rgb(var(--ord-1))", "rgb(var(--ord-2))", "rgb(var(--ord-3))"];
const R = 68;
const STROKE = 26;
const C = 2 * Math.PI * R;
const GAP = 2; // px of surface color between segments

/**
 * Order-status share. The statuses are ordered pipeline stages, so they take a one-hue
 * light -> dark ramp instead of unrelated colors. The legend doubles as the table view.
 */
export function StatusDonut({ slices }: { slices: StatusSlice[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((a, s) => a + s.count, 0);

  let offset = 0;
  const arcs = slices.map((s, i) => {
    const len = total ? (s.count / total) * C : 0;
    const arc = { ...s, i, len, offset };
    offset += len;
    return arc;
  });
  const active = hover === null ? null : slices[hover];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <svg viewBox="0 0 190 190" className="h-full w-full -rotate-90" role="img" aria-label={`Order status: ${slices.map((s) => `${s.label} ${s.count}`).join(", ")}`}>
          <circle cx="95" cy="95" r={R} fill="none" strokeWidth={STROKE} className="stroke-neutral-100" />
          {total > 0 &&
            arcs.map((a) =>
              a.count === 0 ? null : (
                <circle
                  key={a.key}
                  cx="95"
                  cy="95"
                  r={R}
                  fill="none"
                  strokeWidth={hover === a.i ? STROKE + 4 : STROKE}
                  strokeDasharray={`${Math.max(a.len - (slices.filter((s) => s.count > 0).length > 1 ? GAP : 0), 0.01)} ${C}`}
                  strokeDashoffset={-a.offset}
                  style={{ stroke: RAMP[a.i], opacity: hover === null || hover === a.i ? 1 : 0.45, transition: "opacity .15s, stroke-width .15s" }}
                  onPointerEnter={() => setHover(a.i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(a.i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${a.label}: ${a.count}`}
                />
              ),
            )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-3xl font-semibold leading-none">{active ? active.count : total}</span>
          <span className="mt-1 max-w-[100px] text-xs text-neutral-500">{active ? active.label : "Total items"}</span>
        </div>
      </div>

      <table className="w-full min-w-0 flex-1 text-sm">
        <caption className="sr-only">Items by status</caption>
        <thead className="sr-only">
          <tr>
            <th>Status</th>
            <th>Items</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((s, i) => (
            <tr
              key={s.key}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              className={`border-b border-neutral-100 last:border-0 ${hover !== null && hover !== i ? "opacity-50" : ""}`}
            >
              <td className="py-2.5 pr-3">
                <span className="inline-flex items-center gap-2.5">
                  <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: RAMP[i] }} aria-hidden="true" />
                  {s.label}
                </span>
              </td>
              <td className="py-2.5 pr-3 text-right font-display font-semibold tabular-nums">{s.count}</td>
              <td className="py-2.5 text-right tabular-nums text-neutral-500">{total ? Math.round((s.count / total) * 100) : 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
