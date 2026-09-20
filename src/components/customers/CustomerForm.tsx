"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SimilarCustomers } from "@/components/customers/SimilarCustomers";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import type { ActionState } from "@/lib/action-utils";

export function CustomerForm({
  action,
  customer,
  customerId,
  cancelHref = "/customers",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  customer?: { name: string; shipping_address: string };
  /** The customer being edited, so the duplicate check does not flag it against itself. */
  customerId?: string;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const fe = state?.fieldErrors ?? {};
  // Controlled so a failed submit does not wipe what the Owner typed (React 19 resets uncontrolled forms).
  const [name, setName] = useState(customer?.name ?? "");
  const [address, setAddress] = useState(customer?.shipping_address ?? "");

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="Name" name="name" error={fe.name}>
        <input id="name" name="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={`field ${fe.name ? "field-error" : ""}`} />
      </Field>
      <Field label="Shipping address" name="shippingAddress" error={fe.shippingAddress}>
        <textarea
          id="shippingAddress"
          name="shippingAddress"
          rows={3}
          maxLength={500}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={`field ${fe.shippingAddress ? "field-error" : ""}`}
        />
      </Field>
      <SimilarCustomers name={name} address={address} excludeId={customerId} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton>{customer ? "Save changes" : "Add customer"}</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
