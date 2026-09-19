"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwner, ForbiddenError, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, zodToState, type ActionState } from "@/lib/action-utils";
import { isLogoId } from "@/lib/logos";
import { THEMES, THEME_COOKIE } from "@/lib/themes";
import type { Profile } from "@/lib/types";

/** Save the chosen theme in a cookie (per browser). Available to every signed-in role. */
export async function setTheme(themeId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await getProfile())) return { ok: false, error: "Please sign in again." };
  if (!THEMES.some((t) => t.id === themeId)) return { ok: false, error: "Unknown theme." };

  (await cookies()).set(THEME_COOKIE, themeId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

async function ownerOrDenied(): Promise<{ owner: Profile } | { denied: { error: string } }> {
  try {
    return { owner: await assertOwner() };
  } catch (e) {
    if (e instanceof ForbiddenError) return { denied: { error: e.message } };
    throw e;
  }
}

const nameSchema = z.object({ name: z.string().trim().min(1, "Enter a company name.").max(60, "Use at most 60 characters.") });

/** Owner only. RLS (companies_update) also limits this to the Owner's own company. */
export async function updateCompanyName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await ownerOrDenied();
  if ("denied" in auth) return auth.denied;
  const parsed = nameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").update({ name: parsed.data.name }).eq("id", auth.owner.company_id).select("id");
  if (error || !data?.length) return { error: dbError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Company name saved." };
}

/** Owner only. */
export async function updateCompanyLogo(logo: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await ownerOrDenied();
  if ("denied" in auth) return { ok: false, error: auth.denied.error };
  if (!isLogoId(logo)) return { ok: false, error: "Unknown icon." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").update({ logo }).eq("id", auth.owner.company_id).select("id");
  if (error || !data?.length) return { ok: false, error: dbError(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}
