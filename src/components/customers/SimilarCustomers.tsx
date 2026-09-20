"use client";

import { useEffect, useState } from "react";
import { checkSimilarCustomers } from "@/app/actions/customers";
import type { CustomerMatch } from "@/lib/customer-match";

/**
 * Live duplicate check for a customer being typed. Shows existing customers with the same or a similar name (or the
 * same address). `onUse` (optional) adds a "Use this customer" button so the Owner can pick the existing one instead.
 * The Server Actions still refuse an exact duplicate, so this is guidance, not the only guard.
 */
export function SimilarCustomers({
  name,
  address,
  excludeId,
  onUse,
  onExact,
}: {
  name: string;
  address: string;
  excludeId?: string;
  onUse?: (id: string) => void;
  /** Reports whether an exact duplicate (same name and address) is present. */
  onExact?: (exact: boolean) => void;
}) {
  // Results are stored with the input they were fetched for, so stale answers are simply not shown.
  const [result, setResult] = useState<{ key: string; matches: CustomerMatch[] } | null>(null);
  const key = `${name.trim()}|${address.trim()}|${excludeId ?? ""}`;

  useEffect(() => {
    if (name.trim() === "") return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const matches = await checkSimilarCustomers(name, address, excludeId);
        if (!cancelled) setResult({ key, matches });
      } catch {
        // Offline or the action failed: the server still rejects exact duplicates on save.
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [key, name, address, excludeId]);

  const matches = result?.key === key ? result.matches : [];
  const exact = matches.some((m) => m.exact);
  useEffect(() => {
    onExact?.(exact);
  }, [exact, onExact]);

  if (matches.length === 0) return null;

  return (
    <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${exact ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <p className="font-medium">
        {exact ? "This customer already exists." : "Possible duplicate — check before adding."}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {matches.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="min-w-0">
              <span className="font-medium">{m.name}</span>{" "}
              <span className="text-xs opacity-80">
                {m.exact ? "· same name and address" : m.sameName ? "· same name" : m.sameAddress ? "· same address" : "· similar name"}
              </span>
            </span>
            {onUse && (
              <button type="button" onClick={() => onUse(m.id)} className="rounded-full border border-current px-3 py-0.5 text-xs font-semibold hover:bg-white/60">
                Use this customer
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
