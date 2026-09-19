"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwner, ForbiddenError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, zodToState, type ActionState } from "@/lib/action-utils";

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

export async function createCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await ownerOrError();
  if (denied) return denied;
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);

  const supabase = await createClient();
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
