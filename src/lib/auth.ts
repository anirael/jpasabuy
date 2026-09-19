import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { DEFAULT_COMPANY_NAME, DEFAULT_LOGO, isLogoId, type LogoId } from "@/lib/logos";

/** Current user's profile (validated against Supabase Auth), or null. Cached per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, company_id, name, email, role")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

/** The signed-in user's company (name + logo). Readable by both roles through RLS. Cached per request. */
export const getCompany = cache(async (): Promise<{ name: string; logo: LogoId }> => {
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("name, logo").maybeSingle();
  return { name: data?.name || DEFAULT_COMPANY_NAME, logo: isLogoId(data?.logo) ? data.logo : DEFAULT_LOGO };
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Pages: redirect non-owners to the inventory. */
export async function requireOwner(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "OWNER") redirect("/inventory");
  return profile;
}

export class ForbiddenError extends Error {}

/** Server actions: throw instead of redirect so the caller can return a clean error. */
export async function assertOwner(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") throw new ForbiddenError("Only the Owner can do this.");
  return profile;
}
