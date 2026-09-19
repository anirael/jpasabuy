import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OwnerInventory } from "@/components/inventory/OwnerInventory";
import { PasabuyerInventory } from "@/components/inventory/PasabuyerInventory";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconPlus } from "@/components/ui/icons";
import { STATUS_LABEL, STATUSES, type Item, type ItemStatus, type PasabuyerItem } from "@/lib/types";

export const metadata = { title: "Inventory — Calico Cove" };

const MAX_ROWS = 1000;

function matches(q: string, ...fields: (string | null | undefined)[]) {
  const needle = q.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-14 text-center">
      <p className="text-neutral-500">{text}</p>
      {action}
    </div>
  );
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const profile = await requireProfile();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const supabase = await createClient();

  // ---------------- PASABUYER: ONHAND only, from the restricted view ----------------
  if (profile.role !== "OWNER") {
    const { data, error } = await supabase
      .from("pasabuyer_items")
      .select("id, mercari_url, mercari_item_id, image_url, notes, status, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    const all = (data ?? []) as PasabuyerItem[];
    const items = q ? all.filter((i) => matches(q, i.notes, i.mercari_item_id)) : all;
    return (
      <>
        <PageHeader title="Inventory" subtitle="Items that are onhand" search={{ action: "/inventory", defaultValue: q }} />
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            Couldn&apos;t load items. Please refresh.
          </p>
        ) : items.length === 0 ? (
          <Empty text={q ? "No onhand items match your search." : "No onhand items right now."} />
        ) : (
          <PasabuyerInventory items={items} />
        )}
      </>
    );
  }

  // ---------------- OWNER ----------------
  const status: ItemStatus = STATUSES.includes(sp.status as ItemStatus) ? (sp.status as ItemStatus) : "SECURED";
  const { data, error } = await supabase
    .from("items")
    .select("*, customers(name)")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  const all = (data ?? []) as Item[];
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((i) => i.status === s).length])) as Record<ItemStatus, number>;
  const inTab = all.filter((i) => i.status === status);
  const items = q ? inTab.filter((i) => matches(q, i.customers?.name, i.notes, i.mercari_item_id)) : inTab;

  return (
    <>
      <PageHeader
        title="Inventory"
        search={{ action: "/inventory", defaultValue: q, hidden: { status } }}
        actions={
          <Link href="/inventory/new" className="btn-primary shrink-0">
            <IconPlus /> Add item
          </Link>
        }
      />

      <div role="tablist" aria-label="Item status" className="mb-5 flex gap-1 overflow-x-auto rounded-full bg-neutral-100 p-1">
        {STATUSES.map((s) => (
          <Link
            key={s}
            role="tab"
            aria-selected={s === status}
            href={`/inventory?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-center text-sm font-medium transition ${
              s === status ? "bg-white text-ink shadow-sm" : "text-neutral-500 hover:text-ink"
            }`}
          >
            {STATUS_LABEL[s]} <span className="ml-1 text-xs text-neutral-400">{counts[s]}</span>
          </Link>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          Couldn&apos;t load items. Please refresh.
        </p>
      ) : items.length === 0 ? (
        <Empty
          text={q ? "No items match your search." : `No items in ${STATUS_LABEL[status]} yet.`}
          action={
            !q && (
              <Link href="/inventory/new" className="btn-primary mt-4">
                Add an item
              </Link>
            )
          }
        />
      ) : (
        <OwnerInventory items={items} />
      )}
    </>
  );
}
