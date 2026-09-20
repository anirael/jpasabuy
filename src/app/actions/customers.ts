"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwner, ForbiddenError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, zodToState, type ActionState } from "@/lib/action-utils";
import { DUPLICATE_CUSTOMER_ERROR, findSimilarCustomers, type CustomerLite, type CustomerMatch } from "@/lib/customer-match";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Enter the customer's name.").max(120),
  shippingAddress: z.string().trim().max(500, "Address is too long.").default(""),
});

async function ownerOrError(): Promise<ActionState> {
  try {
    await assertOwner();
    return null;
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }
}

/**
 * Existing customers that look like the one being typed, for the duplicate notice on the forms. Returns names only
 * (plus whether the address is the same), never the addresses themselves.
 */
export async function checkSimilarCustomers(name: string, address: string, excludeId?: string): Promise<CustomerMatch[]> {
  if (await ownerOrError()) return [];
  if (typeof name !== "string" || typeof address !== "string" || name.trim() === "") return [];
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("id, name, shipping_address").limit(5000);
  return findSimilarCustomers((data ?? []) as CustomerLite[], name.slice(0, 120), address.slice(0, 500), typeof excludeId === "string" ? excludeId : undefined).slice(0, 5);
}

async function isExactDuplicate(supabase: Awaited<ReturnType<typeof createClient>>, name: string, address: string, excludeId?: string) {
  const { data } = await supabase.from("customers").select("id, name, shipping_address").limit(5000);
  return findSimilarCustomers((data ?? []) as CustomerLite[], name, address, excludeId).some((m) => m.exact);
}

export async function createCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await ownerOrError();
  if (denied) return denied;
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);

  const supabase = await createClient();
  if (await isExactDuplicate(supabase, parsed.data.name, parsed.data.shippingAddress)) {
    return { error: DUPLICATE_CUSTOMER_ERROR, fieldErrors: { name: DUPLICATE_CUSTOMER_ERROR } };
  }
  const { data, error } = await supabase
    .from("customers")
    .insert({ name: parsed.data.name, shipping_address: parsed.data.shippingAddress })
    .select("id")
    .single();
  if (error || !data) return { error: dbError(error) };
  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await ownerOrError();
  if (denied) return denied;
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid customer." };
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);

  const supabase = await createClient();
  if (await isExactDuplicate(supabase, parsed.data.name, parsed.data.shippingAddress, id)) {
    return { error: DUPLICATE_CUSTOMER_ERROR, fieldErrors: { name: DUPLICATE_CUSTOMER_ERROR } };
  }
  const { error } = await supabase
    .from("customers")
    .update({ name: parsed.data.name, shipping_address: parsed.data.shippingAddress })
    .eq("id", id);
  if (error) return { error: dbError(error) };
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true, message: "Customer saved." };
}

export async function deleteCustomer(id: string): Promise<ActionState> {
  const denied = await ownerOrError();
  if (denied) return denied;
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid customer." };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) {
    return {
      error: error.code === "23503" ? "This customer still has items. Delete or reassign their items first." : dbError(error),
    };
  }
  revalidatePath("/customers");
  redirect("/customers");
}
