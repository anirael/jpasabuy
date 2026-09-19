"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createItems, fetchMercari, uploadItemImage } from "@/app/actions/items";
import { CustomerPicker } from "@/components/inventory/CustomerPicker";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { IconPlus } from "@/components/ui/icons";
import { ItemImage } from "@/components/ui/ItemImage";
import { fieldErrorsOf, itemSchema, MAX_ITEMS_PER_SUBMIT, type ItemDraft } from "@/lib/item-schema";
import { isFetchableMercariUrl, isValidItemLink, ITEM_LINK_ERROR, MANUAL_LINK_NOTE } from "@/lib/mercari";
import { calc, formatJPY, formatPHP, RATE_OPTIONS } from "@/lib/money";
import type { ActionState } from "@/lib/action-utils";
import { STATUS_LABEL, STATUSES, type Item, type ItemStatus } from "@/lib/types";

type Props = {
  /** Edit mode only: the Server Action that saves changes to `item`. In create mode the form queues items and submits them together. */
  action?: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  customers: { id: string; name: string }[];
  item?: Item;
};

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; message: string }
  | { kind: "fail"; message: string }
  | { kind: "manual"; message: string };
type Queued = { key: string; draft: ItemDraft; customerLabel: string };

const rateOptions = RATE_OPTIONS.map((r) => r.toFixed(2));
const noopAction = async (): Promise<ActionState> => null;

function draftTotals(d: ItemDraft) {
  const jp = /^\d+$/.test(d.jpPrice.trim()) ? Number(d.jpPrice) : null;
  return calc(jp, d.rate || null, d.pasabuyerRate || null);
}

export function ItemForm({ action, customers, item }: Props) {
  const isEdit = !!item;
  const [state, formAction] = useActionState(action ?? noopAction, null);

  const [mercariUrl, setMercariUrl] = useState(item?.mercari_url ?? "");
  const [urlTouched, setUrlTouched] = useState(false);
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [jpPrice, setJpPrice] = useState(item ? String(item.jp_price) : "");
  const [rate, setRate] = useState(item ? Number(item.rate).toFixed(2) : "");
  const [pasabuyerRate, setPasabuyerRate] = useState(item ? Number(item.pasabuyer_rate).toFixed(2) : "");
  const [customerId, setCustomerId] = useState(item?.customer_id ?? "");
  const [status, setStatus] = useState<ItemStatus>(item?.status ?? "SECURED");
  // Controlled (not defaultValue) so React 19 does not reset them after a failed submit.
  const [secured, setSecured] = useState(item?.secured ?? false);
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>({ kind: "idle" });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Multi-item queue (create mode)
  const [queue, setQueue] = useState<Queued[]>([]);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [addedNote, setAddedNote] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const keySeq = useRef(0); // plain counter: crypto.randomUUID() is unavailable on http:// (e.g. testing from a phone on the LAN)
  const lastFetched = useRef<string | null>(item?.mercari_url ?? null);
  // What the last auto-fetch filled in, so it can be cleared when the link changes (manual entries are left alone).
  const autoFilled = useRef<{ image: string | null; price: number | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const fe = { ...(state?.fieldErrors ?? {}), ...clientErrors };

  const urlValid = isValidItemLink(mercariUrl.trim());
  const urlError =
    fe.mercariUrl ?? (urlTouched && mercariUrl.trim() !== "" && !urlValid ? ITEM_LINK_ERROR : urlTouched && mercariUrl.trim() === "" ? "Paste the Mercari link." : undefined);

  const currentDraft = (): ItemDraft => ({
    mercariUrl: mercariUrl.trim(),
    imageUrl,
    jpPrice,
    rate,
    pasabuyerRate,
    customerId,
    newCustomerName: newName,
    newCustomerAddress: newAddress,
    notes,
    status,
    secured,
  });
  const totals = draftTotals(currentDraft());
  const formHasContent = mercariUrl.trim() !== "" || jpPrice.trim() !== "" || imageUrl.trim() !== "" || notes.trim() !== "";

  const queuedTotal = queue.reduce((a, q) => a + (draftTotals(q.draft).total ?? 0), 0);
  const queuedProfit = queue.reduce((a, q) => a + (draftTotals(q.draft).profit ?? 0), 0);
  const submitCount = queue.length + (formHasContent ? 1 : 0);

  // A field's error goes away as soon as that field is edited (rather than waiting for the next Add Item click).
  const prevFields = useRef<Record<string, unknown>>({});
  useEffect(() => {
    const cur: Record<string, unknown> = { mercariUrl, imageUrl, jpPrice, rate, pasabuyerRate, customerId, newCustomerName: newName, notes, status };
    const prev = prevFields.current;
    prevFields.current = cur;
    setClientErrors((errs) => {
      const changed = Object.keys(errs).filter((k) => k in prev && prev[k] !== cur[k]);
      if (changed.length === 0) return errs;
      const next = { ...errs };
      for (const k of changed) delete next[k];
      return next;
    });
  });

  // Leaving with unsent items would lose them.
  useEffect(() => {
    if (queue.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [queue.length]);

  async function autoFetch(url: string) {
    lastFetched.current = url;
    setFetchState({ kind: "loading" });
    const res = await fetchMercari(url);
    if (lastFetched.current !== url) return; // a newer link superseded this one
    if (!res.ok) {
      setFetchState({ kind: "fail", message: res.message });
      return;
    }
    if (res.imageUrl) setImageUrl(res.imageUrl);
    if (res.jpPrice) setJpPrice(String(res.jpPrice));
    autoFilled.current = { image: res.imageUrl, price: res.jpPrice };
    setFetchState({
      kind: res.partial ? "fail" : "ok",
      message: res.partial
        ? res.imageUrl
          ? res.scraperDown
            ? "Photo loaded. The price service is not reachable right now, so please enter the price below (start the Python scraper to fetch prices automatically)."
            : "Photo loaded, but we could not read the price automatically. Please enter the price below."
          : "We found the price but not the photo. Please add a photo below."
        : "Photo and price fetched. You can still adjust them below.",
    });
  }

  function onUrlChange(value: string) {
    setMercariUrl(value);
    setAddedNote(null);
    const v = value.trim();
    if (v !== lastFetched.current && autoFilled.current) {
      const prev = autoFilled.current;
      autoFilled.current = null;
      setImageUrl((cur) => (prev.image && cur === prev.image ? "" : cur));
      setJpPrice((cur) => (prev.price && cur === String(prev.price) ? "" : cur));
    }
    if (isFetchableMercariUrl(v)) {
      if (v !== lastFetched.current) void autoFetch(v);
    } else if (isValidItemLink(v)) {
      // A valid link we do not read automatically: accept it and let the Owner add the photo and price.
      lastFetched.current = null;
      setFetchState({ kind: "manual", message: MANUAL_LINK_NOTE });
    } else {
      setFetchState({ kind: "idle" });
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadItemImage(fd);
    setUploading(false);
    if ("error" in res) setUploadError(res.error);
    else setImageUrl(res.url);
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Ctrl+V with an image on the clipboard (e.g. a screenshot) uploads it as the photo. Text pastes are untouched. */
  function onPaste(e: React.ClipboardEvent) {
    const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    void onFile(file);
  }

  // ---- create mode: "Add Item" queues the current item; "Submit" saves everything ----------------------------------

  const customerLabel = (d: ItemDraft) =>
    d.customerId === "new" ? `${d.newCustomerName.trim()} (new)` : (customers.find((c) => c.id === d.customerId)?.name ?? "Customer");

  /** Validates the form's current item. Returns it, or null after showing field errors. */
  function validateCurrent(existing: Queued[]): Queued | null {
    setUrlTouched(true);
    const draft = currentDraft();
    const parsed = itemSchema.safeParse(draft);
    if (!parsed.success) {
      setClientErrors(fieldErrorsOf(parsed.error));
      return null;
    }
    if (existing.some((q) => q.draft.mercariUrl === draft.mercariUrl)) {
      setClientErrors({ mercariUrl: "This link is already in your list." });
      return null;
    }
    setClientErrors({});
    return { key: `q${++keySeq.current}`, draft, customerLabel: customerLabel(draft) };
  }

  function addItem() {
    setSubmitError(null);
    if (queue.length >= MAX_ITEMS_PER_SUBMIT) {
      setSubmitError(`You can submit up to ${MAX_ITEMS_PER_SUBMIT} items at once.`);
      return;
    }
    const q = validateCurrent(queue);
    if (!q) return;
    const next = [...queue, q];
    setQueue(next);
    // Reset what is specific to one item; keep customer, rates and status because most orders share them.
    setMercariUrl("");
    setImageUrl("");
    setJpPrice("");
    setNotes("");
    setSecured(false);
    setUrlTouched(false);
    setFetchState({ kind: "idle" });
    lastFetched.current = null;
    autoFilled.current = null;
    setAddedNote(`Item added. ${next.length} ready to submit. Add another, or press Submit.`);
    urlRef.current?.focus();
  }

  function submitAll() {
    setSubmitError(null);
    let all = queue;
    if (formHasContent) {
      // The item still on the form counts too, so nobody loses it by pressing Submit directly.
      const q = validateCurrent(queue);
      if (!q) {
        setSubmitError("Finish the item on the form (or clear it) before submitting.");
        return;
      }
      all = [...queue, q];
    }
    if (all.length === 0) {
      setUrlTouched(true);
      setSubmitError("Add at least one item first.");
      return;
    }
    if (all.length > MAX_ITEMS_PER_SUBMIT) {
      setSubmitError(`You can submit up to ${MAX_ITEMS_PER_SUBMIT} items at once.`);
      return;
    }
    startSubmit(async () => {
      // On success the Server Action redirects to the inventory, so we only get here on failure.
      const res = await createItems(all.map((q) => q.draft));
      if (res?.error) setSubmitError(res.error);
    });
  }

  function editQueued(key: string) {
    if (formHasContent) {
      setSubmitError("Add or clear the item on the form before editing another one.");
      return;
    }
    const q = queue.find((x) => x.key === key);
    if (!q) return;
    const d = q.draft;
    lastFetched.current = d.mercariUrl; // do not re-fetch and overwrite what was already entered
    setMercariUrl(d.mercariUrl);
    setImageUrl(d.imageUrl);
    setJpPrice(d.jpPrice);
    setRate(d.rate);
    setPasabuyerRate(d.pasabuyerRate);
    setCustomerId(d.customerId);
    setNewName(d.newCustomerName);
    setNewAddress(d.newCustomerAddress);
    setNotes(d.notes);
    setStatus(d.status as ItemStatus);
    setSecured(d.secured);
    setQueue((cur) => cur.filter((x) => x.key !== key));
    setSubmitError(null);
    setAddedNote(null);
    urlRef.current?.focus();
  }

  const removeQueued = (key: string) => setQueue((cur) => cur.filter((x) => x.key !== key));

  const queueList = <QueueList queue={queue} total={queuedTotal} profit={queuedProfit} onEdit={editQueued} onRemove={removeQueued} disabled={submitting} />;

  return (
    <form
      {...(isEdit
        ? {
            action: (fd: FormData) => {
              setUrlTouched(true);
              if (!isValidItemLink(mercariUrl.trim())) return; // client-side gate; the server re-validates
              formAction(fd);
            },
          }
        : {
            onSubmit: (e: React.FormEvent) => {
              e.preventDefault(); // Enter adds the item; only the Submit button saves the whole list
              addItem();
            },
          })}
      onPaste={onPaste}
      className="grid gap-8 lg:grid-cols-[1fr_340px]"
      noValidate
    >
      <div className="min-w-0 space-y-5">
        {/* On phones the queued items sit above the form so the effect of "Add Item" is visible */}
        {!isEdit && queue.length > 0 && <div className="lg:hidden">{queueList}</div>}

        <FormMessage state={state} />

        <Field
          label="Item link"
          name="mercariUrl"
          error={urlError}
          hint="Mercari links (…/item/m123, …/shops/product/abc123, with or without /en/) fetch the photo and price for you. Any other link needs to be manually added."
        >
          <input
            ref={urlRef}
            id="mercariUrl"
            name="mercariUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://jp.mercari.com/item/m…"
            value={mercariUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            onBlur={() => setUrlTouched(true)}
            aria-invalid={!!urlError}
            aria-describedby={urlError ? "mercariUrl-error" : undefined}
            className={`field ${urlError ? "field-error" : ""}`}
          />
        </Field>

        {fetchState.kind === "loading" && (
          <p role="status" className="rounded-xl bg-neutral-50 px-4 py-2.5 text-sm text-neutral-600">
            Fetching photo and price from Mercari…
          </p>
        )}
        {fetchState.kind === "ok" && (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
            {fetchState.message}
          </p>
        )}
        {fetchState.kind === "manual" && (
          <p role="status" className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-700">
            {fetchState.message}
          </p>
        )}
        {fetchState.kind === "fail" && (
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            {fetchState.message}
          </p>
        )}

        {/* Photo */}
        <fieldset className="space-y-3">
          <legend className="label">Photo</legend>
          <p className="-mt-1 text-xs text-neutral-500">Paste a photo (Ctrl+V anywhere on this form), paste an image link, or upload a file.</p>
          <div className="flex items-start gap-4">
            <ItemImage src={imageUrl.trim() || null} className="h-24 w-24" alt="Item preview" />
            <div className="min-w-0 flex-1 space-y-2">
              <input
                id="imageUrl"
                name="imageUrl"
                type="url"
                inputMode="url"
                placeholder="Paste an image URL (optional)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                aria-label="Image URL"
                className={`field ${fe.imageUrl ? "field-error" : ""}`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                <button type="button" className="btn-secondary !py-1.5" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? "Uploading…" : "Upload photo"}
                </button>
                {imageUrl && (
                  <button type="button" className="text-sm text-neutral-500 hover:text-ink" onClick={() => setImageUrl("")}>
                    Remove
                  </button>
                )}
              </div>
              {(uploadError || fe.imageUrl) && (
                <p role="alert" className="text-xs text-red-600">
                  {uploadError ?? fe.imageUrl}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price (JPY)" name="jpPrice" error={fe.jpPrice}>
            <input
              id="jpPrice"
              name="jpPrice"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="e.g. 3500"
              value={jpPrice}
              onChange={(e) => setJpPrice(e.target.value.replace(/[^\d]/g, ""))}
              className={`field ${fe.jpPrice ? "field-error" : ""}`}
            />
          </Field>
          <Field label="Rate (JPY → PHP)" name="rate" error={fe.rate}>
            <select id="rate" name="rate" value={rate} onChange={(e) => setRate(e.target.value)} className={`field ${fe.rate ? "field-error" : ""}`}>
              <option value="">Select…</option>
              {rateOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pasabuyer rate" name="pasabuyerRate" error={fe.pasabuyerRate}>
            <select
              id="pasabuyerRate"
              name="pasabuyerRate"
              value={pasabuyerRate}
              onChange={(e) => setPasabuyerRate(e.target.value)}
              className={`field ${fe.pasabuyerRate ? "field-error" : ""}`}
            >
              <option value="">Select…</option>
              {rateOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Customer" name="customerId" error={fe.customerId}>
          <CustomerPicker id="customerId" name="customerId" customers={customers} value={customerId} onChange={setCustomerId} invalid={!!fe.customerId} />
        </Field>

        {customerId === "new" && (
          <div className="space-y-4 rounded-2xl bg-neutral-50 p-4">
            <Field label="New customer name" name="newCustomerName" error={fe.newCustomerName}>
              <input id="newCustomerName" name="newCustomerName" maxLength={120} value={newName} onChange={(e) => setNewName(e.target.value)} className={`field ${fe.newCustomerName ? "field-error" : ""}`} />
            </Field>
            <Field label="Shipping address" name="newCustomerAddress" error={fe.newCustomerAddress}>
              <textarea id="newCustomerAddress" name="newCustomerAddress" rows={2} maxLength={500} value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="field" />
            </Field>
            {!isEdit && <p className="text-xs text-neutral-500">Items you add with the same new customer name and address share one customer record.</p>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" name="status" error={fe.status}>
            <select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value as ItemStatus)} className="field">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end pb-2.5">
            <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input type="checkbox" name="secured" checked={secured} onChange={(e) => setSecured(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 accent-accent" />
              Packed
            </label>
          </div>
        </div>

        <Field label="Notes (optional)" name="notes" error={fe.notes}>
          <textarea id="notes" name="notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className={`field ${fe.notes ? "field-error" : ""}`} />
        </Field>

        {addedNote && (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
            {addedNote}
          </p>
        )}
        {submitError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {isEdit ? (
            <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
          ) : (
            <>
              {/* type=submit -> the form's onSubmit -> addItem() */}
              <button type="submit" className="btn-secondary" disabled={submitting}>
                <IconPlus /> Add Item
              </button>
              <button type="button" className="btn-primary" disabled={submitting} onClick={submitAll}>
                {submitting ? "Submitting…" : submitCount > 0 ? `Submit (${submitCount})` : "Submit"}
              </button>
            </>
          )}
          <Link href="/inventory" className="btn-secondary">
            Cancel
          </Link>
        </div>
        {!isEdit && (
          <p className="text-xs text-neutral-500">
            <strong className="font-medium text-neutral-700">Add Item</strong> puts this item in your list so you can enter another one for the same order.{" "}
            <strong className="font-medium text-neutral-700">Submit</strong> saves everything in the list at once.
          </p>
        )}
      </div>

      <aside className="min-w-0 space-y-6 lg:sticky lg:top-8 lg:self-start" aria-label="Price breakdown">
        <div className="card space-y-4 p-5">
          <h2 className="font-display text-base font-semibold">{isEdit ? "Price breakdown" : "Current item"}</h2>
          <Row label="Total price (customer)" value={totals.total} strong />
          <Row label="Pasabuyer cost" value={totals.cost} />
          <div className="border-t border-neutral-100 pt-4">
            <Row label="Profit" value={totals.profit} strong tone={totals.profit !== null && totals.profit < 0 ? "bad" : "good"} />
          </div>
          <p className="text-xs text-neutral-500">Total = price × rate. Cost = price × Pasabuyer rate. Amounts in PHP.</p>
        </div>
        {!isEdit && <div className="hidden lg:block">{queueList}</div>}
      </aside>
    </form>
  );
}

function QueueList({
  queue,
  total,
  profit,
  onEdit,
  onRemove,
  disabled,
}: {
  queue: Queued[];
  total: number;
  profit: number;
  onEdit: (key: string) => void;
  onRemove: (key: string) => void;
  disabled: boolean;
}) {
  return (
    <section className="card p-4" aria-label="Items to submit">
      <h2 className="font-display text-base font-semibold">Items to submit ({queue.length})</h2>
      {queue.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">Nothing added yet. Fill in an item and press Add Item.</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-neutral-100">
            {queue.map((q, i) => {
              const t = draftTotals(q.draft);
              return (
                <li key={q.key} className="flex gap-3 py-3 first:pt-0">
                  <ItemImage src={q.draft.imageUrl.trim() || null} className="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {i + 1}. {q.customerLabel}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatJPY(q.draft.jpPrice)} × {q.draft.rate} → <span className="font-medium text-ink">{t.total === null ? "—" : formatPHP(t.total)}</span>
                    </p>
                    <div className="mt-1 flex gap-3 text-xs">
                      <button type="button" disabled={disabled} onClick={() => onEdit(q.key)} className="font-medium text-neutral-600 hover:text-ink hover:underline disabled:opacity-50">
                        Edit
                      </button>
                      <button type="button" disabled={disabled} onClick={() => onRemove(q.key)} className="font-medium text-red-600 hover:underline disabled:opacity-50">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 space-y-1 border-t border-neutral-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Total price</span>
              <span className="font-display font-semibold">{formatPHP(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Profit</span>
              <span className={`font-display font-semibold ${profit < 0 ? "text-red-600" : "text-emerald-600"}`}>{formatPHP(profit)}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Row({ label, value, strong = false, tone }: { label: string; value: number | null; strong?: boolean; tone?: "good" | "bad" }) {
  const color = tone === "bad" ? "text-red-600" : tone === "good" ? "text-emerald-600" : "";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className={`font-display ${strong ? "text-xl font-semibold" : "text-base"} ${color}`}>{value === null ? "—" : formatPHP(value)}</span>
    </div>
  );
}
