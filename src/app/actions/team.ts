"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwner, ForbiddenError } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";
import { zodToState, type ActionState } from "@/lib/action-utils";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters."),
});

async function getOwner(): Promise<{ owner: Profile } | { denied: NonNullable<ActionState> }> {
  try {
    return { owner: await assertOwner() };
  } catch (e) {
    if (e instanceof ForbiddenError) return { denied: { error: e.message } };
    throw e;
  }
}

/** Owner creates a PASABUYER account inside their OWN company (company_id comes from the session, never the form). */
export async function createPasabuyer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getOwner();
  if ("denied" in auth) return auth.denied;
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const { name, email, password } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error || !data.user) {
    const exists = error?.message?.toLowerCase().includes("already");
    return { error: exists ? "An account with that email already exists." : "Could not create the account." };
  }
  const { error: profileErr } = await admin
    .from("profiles")
    .insert({ id: data.user.id, company_id: auth.owner.company_id, name, email, role: "PASABUYER" });
  if (profileErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Could not create the account." };
  }
  revalidatePath("/team");
  return { ok: true, message: `Account created for ${email}. Share the password with them securely.` };
}

export async function deletePasabuyer(userId: string): Promise<ActionState> {
  const auth = await getOwner();
  if ("denied" in auth) return auth.denied;
  if (!z.string().uuid().safeParse(userId).success) return { error: "Invalid user." };

  const admin = createAdminClient();
  // Only delete a PASABUYER that belongs to the Owner's own company.
  const { data: target } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .eq("company_id", auth.owner.company_id)
    .eq("role", "PASABUYER")
    .maybeSingle();
  if (!target) return { error: "Account not found." };

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "Could not remove the account." };
  revalidatePath("/team");
  return { ok: true, message: "Account removed." };
}
