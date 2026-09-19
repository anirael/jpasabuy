"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteItem } from "@/app/actions/items";

export function DeleteItemButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn-danger"
        onClick={() => {
          if (!window.confirm("Delete this item? This cannot be undone.")) return;
          start(async () => {
            const res = await deleteItem(id);
            if (res?.error) setError(res.error);
            else router.replace("/inventory");
          });
        }}
      >
        {pending ? "Deleting…" : "Delete item"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
