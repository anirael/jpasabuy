// Item validation shared by the browser form (per-item "Add Item" check) and the Server Actions,
// so both apply exactly the same rules. Pure zod — safe to import from client components.
import { z } from "zod";
import { isValidItemLink, ITEM_LINK_ERROR } from "@/lib/mercari";
import { RATE_OPTIONS } from "@/lib/money";
import { CATEGORIES, STATUSES } from "@/lib/types";

const rateValues = RATE_OPTIONS.map((r) => r.toFixed(2)) as [string, ...string[]];

export const isManual = (v: boolean | string | undefined) => v === true || v === "1";

const blankToNull =(v: unknown) => (v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : v);

export const itemSchema = z
  .object({
    /** Required unless `manual` is set; a manual listing has no link at all. Checked in superRefine. */
    mercariUrl: z.string().trim().default(""),
    /** "1" from the form's hidden input, or a real boolean from the multi-item form. */
    manual: z.union([z.string(), z.boolean()]).optional(),
    imageUrl: z
      .string()
      .trim()
      .max(2048, "Image URL is too long.")
      .refine((v) => {
        if (v === "") return true;
        try {
          const u = new URL(v);
          return u.protocol === "https:" || u.protocol === "http:";
        } catch {
          return false;
        }
      }, "Enter a valid http(s) image URL."),
    // Price and both rates are optional: blank -> null, anything else is still validated.
    jpPrice: z.preprocess(
      blankToNull,
      z.coerce
        .number({ message: "Enter the price in yen." })
        .int("Use a whole number of yen.")
        .positive("Price must be greater than 0.")
        .max(99_999_999, "Price is too large.")
        .nullable(),
    ),
    rate: z.preprocess(blankToNull, z.enum(rateValues, { message: "Choose a rate." }).nullable()),
    pasabuyerRate: z.preprocess(blankToNull, z.enum(rateValues, { message: "Choose a Pasabuyer rate." }).nullable()),
    customerId: z.string().min(1, "Choose a customer."),
    newCustomerName: z.string().trim().max(120).default(""),
    newCustomerAddress: z.string().trim().max(500).default(""),
    notes: z.string().trim().max(2000, "Notes are too long.").default(""),
    status: z.enum(STATUSES as [string, ...string[]]),
    category: z.preprocess(blankToNull, z.enum(CATEGORIES, { message: "Choose a category." }).nullable()),
    /** "on" from a checkbox in FormData, or a real boolean from the multi-item form. */
    secured: z.union([z.string(), z.boolean()]).optional(),
  })
  // The link rule depends on `manual`. `when` keeps it running even when other fields have errors, so the form
  // can show every problem at once (object-level refinements are skipped by default after a field error).
  .refine(
    (v) => {
      const link = typeof v.mercariUrl === "string" ? v.mercariUrl : "";
      return isManual(v.manual) ? link === "" : isValidItemLink(link);
    },
    {
      path: ["mercariUrl"],
      error: (iss) => (isManual((iss.input as { manual?: boolean | string } | undefined)?.manual) ? "A manual listing has no link." : ITEM_LINK_ERROR),
      when: () => true,
    },
  )
  .superRefine((v, ctx) => {
    if (v.customerId === "new") {
      if (!v.newCustomerName) ctx.addIssue({ code: "custom", path: ["newCustomerName"], message: "Enter the new customer's name." });
    } else if (!z.string().uuid().safeParse(v.customerId).success) {
      ctx.addIssue({ code: "custom", path: ["customerId"], message: "Choose a customer." });
    }
  });

export type ParsedItem = z.output<typeof itemSchema>;

/** The raw (string-valued) fields of one item as typed into the form. */
export type ItemDraft = {
  /** A manual listing: no link, the photo/price/notes are entered by hand. */
  manual: boolean;
  mercariUrl: string;
  imageUrl: string;
  jpPrice: string;
  rate: string;
  pasabuyerRate: string;
  customerId: string;
  newCustomerName: string;
  newCustomerAddress: string;
  notes: string;
  category: string;
  status: string;
  secured: boolean;
};

export const isSecured = (v: ParsedItem["secured"]) => v === true || v === "on";

export const MAX_ITEMS_PER_SUBMIT = 50;

/** First error per field, keyed by field name. */
export function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
