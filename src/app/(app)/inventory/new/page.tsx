import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ItemForm } from "@/components/inventory/ItemForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Add items" };

export default async function NewItemPage() {
  const supabase = await createClient();
  // The role is only a gate, so the queries start with the check instead of after it (RLS already stops non-owners; requireOwner() still redirects them).
  const [, { data }] = await Promise.all([requireOwner(), supabase.from("customers").select("id, name").order("name")]);
  return (
    <>
      <PageHeader title="Add items" subtitle="Buying several things for one order? Add each item, then Submit them all at once." />
      <ItemForm customers={data ?? []} />
    </>
  );
}
