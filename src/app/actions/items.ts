"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwner, ForbiddenError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, zodToState, type ActionState } from "@/lib/action-utils";
import { isFetchableMercariUrl, mercariImageUrl, MANUAL_LINK_NOTE } from "@/lib/mercari";
import { fieldErrorsOf, isManual, isSecured, itemSchema, MAX_ITEMS_PER_SUBMIT, type ParsedItem } from "@/lib/item-schema";
import { DUPLICATE_CUSTOMER_ERROR, findSimilarCustomers, type CustomerLite } from "@/lib/customer-match";
import { STATUSES, type Profile } from "@/lib/types";

type Denied = { error: string };

async function ownerOrError(): Promise<{ owner: Profile } | { denied: Denied }> {
  try {
    return { owner: await assertOwner() };
  } catch (e) {
    if (e instanceof ForbiddenError) return { denied: { error: e.message } };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Mercari auto-fetch (delegates to the Python scraper service)
// ---------------------------------------------------------------------------
export type MercariResult =
  | { ok: true; imageUrl: string | null; jpPrice: number | null; partial: boolean; scraperDown: boolean }
  | { ok: false; message: string };

const FALLBACK_MESSAGE =
  "We couldn't auto-fetch this item. No problem — add the photo and price manually below and save as usual.";

export async function fetchMercari(url: string): Promise<MercariResult> {
  const auth = await ownerOrError();
  if ("denied" in auth) return { ok: false, message: auth.denied.error };

  // SSRF guard #1: only ever forward URLs that match one of the exact Mercari shapes. Any other link
  // is still a valid item link, but it is never fetched; the Owner adds the photo and price by hand.
  if (typeof url !== "string" || !isFetchableMercariUrl(url)) return { ok: false, message: MANUAL_LINK_NOTE };

  // The photo URL is derived from the item ID, so we can always offer it even if the scraper is down.
  const derivedImage = mercariImageUrl(url);
  const withPhotoOnly = (): MercariResult =>
    derivedImage ? { ok: true, imageUrl: derivedImage, jpPrice: null, partial: true, scraperDown: true } : { ok: false, message: FALLBACK_MESSAGE };

  const base = process.env.SCRAPER_URL;
  if (!base) {
    console.warn("[fetchMercari] SCRAPER_URL is not set; returning the photo only");
    return withPhotoOnly();
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Scraper-Secret": process.env.SCRAPER_SECRET ?? "" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[fetchMercari] scraper responded ${res.status} (401 = SCRAPER_SECRET mismatch, 503 = secret not set on the scraper)`);
      return withPhotoOnly();
    }
    const data = (await res.json()) as { image_url?: string | null; jp_price?: number | null };

    const scraped = typeof data.image_url === "string" && /^https:\/\/[^\s]+$/.test(data.image_url) && data.image_url.length <= 2048 ? data.image_url : null;
    const imageUrl = scraped ?? derivedImage;
    const jpPrice = Number.isInteger(data.jp_price) && (data.jp_price as number) > 0 && (data.jp_price as number) < 100_000_000 ? (data.jp_price as number) : null;
    if (!imageUrl && !jpPrice) return { ok: false, message: FALLBACK_MESSAGE };
    return { ok: true, imageUrl, jpPrice, partial: !imageUrl || !jpPrice, scraperDown: false };
  } catch (e) {
    console.warn(`[fetchMercari] could not reach the scraper at ${base}: ${e instanceof Error ? e.message : e}`);
    return withPhotoOnly();
  }
}

// ---------------------------------------------------------------------------
// Manual image upload
// ---------------------------------------------------------------------------
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function sniffImage(bytes: Uint8Array): { ext: string; type: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: "png", type: "image/png" };
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return { ext: "webp", type: "image/webp" };
  return null;
}

export async function uploadItemImage(formData: FormData): Promise<{ url: string } | { error: string }> {
  const auth = await ownerOrError();
  if ("denied" in auth) return { error: auth.denied.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image file." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Image is too large (max 5 MB)." };
  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) return { error: "Only JPG, PNG or WebP images are allowed." };

  const supabase = await createClient();
  const path = `${auth.owner.company_id}/${randomUUID()}.${kind.ext}`;
  const { error } = await supabase.storage.from("item-images").upload(path, buf, { contentType: kind.type, upsert: false });
  if (error) return { error: "Upload failed. You can paste an image URL instead." };
  const { data } = supabase.storage.from("item-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

// ---------------------------------------------------------------------------
// Create / update / delete
// ---------------------------------------------------------------------------
/**
 * Multi-item submit: one "Submit" saves every item the Owner queued with "Add Item".
 * All items go in with a single INSERT (all-or-nothing); customers created on the fly are de-duplicated
 * by name+address so several items for the same new customer share one customer row.
 */
export async function createItems(drafts: unknown): Promise<ActionState> {
  const auth = await ownerOrError();
  if ("denied" in auth) return auth.denied;
  if (!Array.isArray(drafts) || drafts.length === 0) return { error: "Add at least one item before submitting." };
  if (drafts.length > MAX_ITEMS_PER_SUBMIT) return { error: `You can submit up to ${MAX_ITEMS_PER_SUBMIT} items at once.` };

  const items: ParsedItem[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const parsed = itemSchema.safeParse(drafts[i]);
    if (!parsed.success) {
      const message = Object.values(fieldErrorsOf(parsed.error))[0] ?? "Invalid item.";
      return { error: `Item ${i + 1}: ${message}`, fieldErrors: { [String(i)]: message } };
    }
    items.push(parsed.data);
  }

  const supabase = await createClient();
  // Refuse to create a customer that already exists (same name and address); the form warns about this earlier.
  const wantsNew = items.filter((v) => v.customerId === "new");
  if (wantsNew.length > 0) {
    const { data: existing, error } = await supabase.from("customers").select("id, name, shipping_address").limit(5000);
    if (error) return { error: dbError(error) };
    const dup = wantsNew.find((v) => findSimilarCustomers((existing ?? []) as CustomerLite[], v.newCustomerName, v.newCustomerAddress).some((m) => m.exact));
    if (dup) return { error: `${dup.newCustomerName}: ${DUPLICATE_CUSTOMER_ERROR}` };
  }
  const newCustomers = new Map<string, string>();
  const createdIds: string[] = [];
  const rollback = async () => {
    if (createdIds.length) await supabase.from("customers").delete().in("id", createdIds);
  };

  const rows = [];
  for (const v of items) {
    let customerId = v.customerId;
    if (customerId === "new") {
      const key = `${v.newCustomerName.toLowerCase()}|${v.newCustomerAddress.toLowerCase()}`;
      let id = newCustomers.get(key);
      if (!id) {
        const { data, error } = await supabase
          .from("customers")
          .insert({ name: v.newCustomerName, shipping_address: v.newCustomerAddress })
          .select("id")
          .single();
        if (error || !data) {
          await rollback();
          return { error: dbError(error) };
        }
        id = data.id as string;
        newCustomers.set(key, id);
        createdIds.push(id);
      }
      customerId = id;
    }
    rows.push({
      customer_id: customerId,
      mercari_url: isManual(v.manual) ? null : v.mercariUrl,
      image_url: v.imageUrl || null,
      jp_price: v.jpPrice,
      rate: v.rate,
      pasabuyer_rate: v.pasabuyerRate,
      status: v.status,
      category: v.category,
      secured: isSecured(v.secured),
      notes: v.notes,
    });
  }

  const { error } = await supabase.from("items").insert(rows);
  if (error) {
    await rollback();
    return { error: dbError(error) };
  }
  revalidatePath("/inventory");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  redirect(`/inventory?status=${items[0].status}`);
}

export async function updateItem(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await ownerOrError();
  if ("denied" in auth) return auth.denied;
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid item." };
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodToState(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  let customerId = v.customerId;
  let createdCustomerId: string | null = null;
  if (customerId === "new") {
    const { data: existing } = await supabase.from("customers").select("id, name, shipping_address").limit(5000);
    if (findSimilarCustomers((existing ?? []) as CustomerLite[], v.newCustomerName, v.newCustomerAddress).some((m) => m.exact)) {
      return { error: DUPLICATE_CUSTOMER_ERROR, fieldErrors: { newCustomerName: DUPLICATE_CUSTOMER_ERROR } };
    }
    const { data, error } = await supabase
      .from("customers")
      .insert({ name: v.newCustomerName, shipping_address: v.newCustomerAddress })
      .select("id")
      .single();
    if (error || !data) return { error: dbError(error) };
    customerId = createdCustomerId = data.id;
  }

  const { error } = await supabase
    .from("items")
    .update({
      customer_id: customerId,
      mercari_url: isManual(v.manual) ? null : v.mercariUrl,
      image_url: v.imageUrl || null,
      jp_price: v.jpPrice,
      rate: v.rate,
      pasabuyer_rate: v.pasabuyerRate,
      status: v.status,
      category: v.category,
      secured: isSecured(v.secured),
      notes: v.notes,
    })
    .eq("id", id);
  if (error) {
    if (createdCustomerId) await supabase.from("customers").delete().eq("id", createdCustomerId);
    return { error: dbError(error) };
  }
  revalidatePath("/inventory");
  revalidatePath("/customers");
  redirect(`/inventory?status=${v.status}`);
}

export async function setItemStatus(id: string, status: string): Promise<ActionState> {
  const auth = await ownerOrError();
  if ("denied" in auth) return auth.denied;
  if (!z.string().uuid().safeParse(id).success || !STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { error: "Invalid request." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("items").update({ status }).eq("id", id);
  if (error) return { error: dbError(error) };
  revalidatePath("/inventory");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setItemSecured(id: string, secured: boolean): Promise<ActionState> {
  const auth = await ownerOrError();
  if ("denied" in auth) return auth.denied;
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.from("items").update({ secured: !!secured }).eq("id", id);
  if (error) return { error: dbError(error) };
  revalidatePath("/inventory");
  revalidatePath("/customers");
  return { ok: true };
}

export async function deleteItem(id: string): Promise<ActionState> {
  const auth = await ownerOrError();
  if ("denied" in auth) return auth.denied;
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) return { error: dbError(error) };
  revalidatePath("/inventory");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true };
}
