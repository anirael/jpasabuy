"use client";

import { useState, useTransition } from "react";
import { deleteCustomer } from "@/app/actions/customers";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn-danger"
        onClick={() => {
          if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
          setError(null);
          start(async () => {
            const res = await deleteCustomer(id); // redirects to /customers on success
            if (res?.error) setError(res.error);
          });
        }}
      >
        {pending ? "Deleting…" : "Delete customer"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
