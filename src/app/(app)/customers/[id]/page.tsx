import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateCustomer } from "@/app/actions/customers";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { DeleteCustomerButton } from "@/components/customers/DeleteCustomerButton";
import { ItemImage } from "@/components/ui/ItemImage";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusIndicators } from "@/components/ui/StatusBadge";
import { formatJPY, formatPHPDecimal } from "@/lib/money";
import type { Item } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata = { title: "Customer — Calico Cove" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: customer }, { data: items }] = await Promise.all([
    supabase.from("customers").select("id, name, shipping_address, created_at").eq("id", id).maybeSingle(),
    supabase.from("items").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  if (!customer) notFound();
  const list = (items ?? []) as Item[];

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={`Customer since ${new Date(customer.created_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium" })}`}
      />

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <section aria-labelledby="details" className="space-y-6">
          <div className="card p-5">
            <h2 id="details" className="mb-4 font-display text-base font-semibold">
              Details
            </h2>
            <CustomerForm action={updateCustomer.bind(null, id)} customer={customer} />
          </div>
          <DeleteCustomerButton id={id} name={customer.name} />
        </section>

        <section aria-labelledby="items">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="items" className="font-display text-base font-semibold">
              Items ({list.length})
            </h2>
            <Link href="/inventory/new" className="btn-secondary !py-1.5">
              Add item
            </Link>
          </div>
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-12 text-center text-neutral-500">No items yet.</div>
          ) : (
            <ul className="space-y-3">
              {list.map((i) => (
                <li key={i.id}>
                  <Link href={`/inventory/${i.id}`} className="card flex gap-3 p-3 transition hover:border-accent/40 sm:gap-4 sm:p-4">
                    <ItemImage src={i.image_url} className="h-16 w-16 sm:h-20 sm:w-20" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="font-mono text-xs text-neutral-500">{i.mercari_item_id ?? "—"}</p>
                        <p className="font-display text-sm font-semibold">
                          {formatJPY(i.jp_price)} → {i.total_price == null ? "—" : formatPHPDecimal(i.total_price)}
                        </p>
                      </div>
                      {i.notes && <p className="line-clamp-2 break-words text-sm text-neutral-600">{i.notes}</p>}
                      <StatusIndicators status={i.status} secured={i.secured} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
