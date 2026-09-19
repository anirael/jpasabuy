"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { zodToState, type ActionState } from "@/lib/action-utils";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(200),
});

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for unknown email / wrong password (no account enumeration).
  if (error) return { error: "Incorrect email or password." };
  redirect("/");
}

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  companyName: z.string().trim().min(1, "Enter your business name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters."),
});

export async function signup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (process.env.ALLOW_SIGNUP === "false") return { error: "Signup is disabled. Ask your Owner for an account." };
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const { name, companyName, email, password } = parsed.data;

  const admin = createAdminClient();
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (userErr || !created.user) {
    const exists = userErr?.message?.toLowerCase().includes("already");
    return { error: exists ? "An account with that email already exists." : "Could not create the account. Please try again." };
  }
  const userId = created.user.id;

  const { data: company, error: companyErr } = await admin.from("companies").insert({ name: companyName }).select("id").single();
  if (companyErr || !company) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "Could not create the account. Please try again." };
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .insert({ id: userId, company_id: company.id, name, email, role: "OWNER" });
  if (profileErr) {
    await admin.from("companies").delete().eq("id", company.id);
    await admin.auth.admin.deleteUser(userId);
    return { error: "Could not create the account. Please try again." };
  }

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) redirect("/login");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
