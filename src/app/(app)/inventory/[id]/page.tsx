import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateItem } from "@/app/actions/items";
import { DeleteItemButton } from "@/components/inventory/DeleteItemButton";
import { ItemForm } from "@/components/inventory/ItemForm";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Item } from "@/lib/types";

export const metadata = { title: "Edit item — Calico Cove" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: item }, { data: customers }] = await Promise.all([
    supabase.from("items").select("*").eq("id", id).maybeSingle(),
    supabase.from("customers").select("id, name").order("name"),
  ]);
  if (!item) notFound();

  return (
    <>
      <PageHeader title="Edit item" subtitle={(item as Item).mercari_item_id ? `Item ${(item as Item).mercari_item_id}` : undefined} />
      <ItemForm action={updateItem.bind(null, id)} customers={customers ?? []} item={item as Item} />
      <div className="mt-10 border-t border-neutral-100 pt-6">
        <DeleteItemButton id={id} />
      </div>
    </>
  );
}
