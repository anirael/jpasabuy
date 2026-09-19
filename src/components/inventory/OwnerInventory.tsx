"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteItem, setItemSecured, setItemStatus } from "@/app/actions/items";
import { ImageZoom } from "@/components/ui/ImageZoom";
import { IconExpand } from "@/components/ui/icons";
import { formatJPY, formatPHPDecimal, formatRate } from "@/lib/money";
import { STATUS_LABEL, STATUSES, type Item, type ItemStatus } from "@/lib/types";

function OpenPill({ id }: { id: string }) {
  return (
    <Link
      href={`/inventory/${id}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[13px] font-semibold shadow-sm transition hover:bg-neutral-50"
    >
      <IconExpand />
      Open
    </Link>
  );
}

function StatusSelect({ item, disabled, onChange }: { item: Item; disabled: boolean; onChange: (s: ItemStatus) => void }) {
  return (
    <select
      aria-label="Change status"
      value={item.status}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as ItemStatus)}
      className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

function PackedToggle({ item, disabled, onChange }: { item: Item; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={item.secured}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-neutral-300 accent-accent"
      />
      Packed
    </label>
  );
}

export function OwnerInventory({ items }: { items: Item[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(id: string, fn: () => Promise<{ error?: string } | null>) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      setPendingId(null);
    });
  }

  const onDelete = (item: Item) => {
    if (!window.confirm(`Delete this item for ${item.customers?.name ?? "this customer"}? This cannot be undone.`)) return;
    run(item.id, () => deleteItem(item.id));
  };

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-neutral-200 xl:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-neutral-100/70 text-neutral-500">
            <tr>
              {["Product Image", "Customer", "JP Price", "Rate", "Total Price", "Notes", "Status", ""].map((h, i) => (
                <th key={i} scope="col" className="whitespace-nowrap px-4 py-3.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.map((item) => {
              const busy = pendingId === item.id;
              return (
                <tr key={item.id} className={busy ? "opacity-60" : ""}>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <ImageZoom src={item.image_url} />
                      <span className="-ml-2.5">
                        <OpenPill id={item.id} />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{item.customers?.name ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatJPY(item.jp_price)}</td>
                  <td className="px-4 py-3">{formatRate(item.rate)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{formatPHPDecimal(item.total_price)}</td>
                  <td className="max-w-[220px] px-4 py-3 text-neutral-600">
                    <span className="line-clamp-2 whitespace-pre-line break-words">{item.notes || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-2">
                      <StatusSelect item={item} disabled={busy} onChange={(s) => run(item.id, () => setItemStatus(item.id, s))} />
                      <PackedToggle item={item} disabled={busy} onChange={(v) => run(item.id, () => setItemSecured(item.id, v))} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/inventory/${item.id}`} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
                        Edit
                      </Link>
                      <button type="button" onClick={() => onDelete(item)} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 xl:hidden">
        {items.map((item) => {
          const busy = pendingId === item.id;
          return (
            <li key={item.id} className={`card p-4 ${busy ? "opacity-60" : ""}`}>
              <div className="flex gap-3">
                <ImageZoom src={item.image_url} className="h-20 w-20" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.customers?.name ?? "—"}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {formatJPY(item.jp_price)} × {formatRate(item.rate)}
                  </p>
                  <p className="font-display text-lg font-semibold">{formatPHPDecimal(item.total_price)}</p>
                </div>
              </div>
              {item.notes && <p className="mt-3 whitespace-pre-line break-words text-sm text-neutral-600">{item.notes}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <StatusSelect item={item} disabled={busy} onChange={(s) => run(item.id, () => setItemStatus(item.id, s))} />
                <PackedToggle item={item} disabled={busy} onChange={(v) => run(item.id, () => setItemSecured(item.id, v))} />
              </div>
              <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
                <Link href={`/inventory/${item.id}`} className="btn-secondary flex-1 !py-2">
                  Edit
                </Link>
                <button type="button" onClick={() => onDelete(item)} className="btn-danger flex-1 !py-2">
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
