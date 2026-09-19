import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ItemForm } from "@/components/inventory/ItemForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Add items — Calico Cove" };

export default async function NewItemPage() {
  await requireOwner();
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("id, name").order("name");
  return (
    <>
      <PageHeader title="Add items" subtitle="Buying several things for one order? Add each item, then Submit them all at once." />
      <ItemForm customers={data ?? []} />
    </>
  );
}
