"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createPasabuyer, deletePasabuyer } from "@/app/actions/team";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";

export function CreatePasabuyerForm() {
  const [state, formAction] = useActionState(createPasabuyer, null);
  const fe = state?.fieldErrors ?? {};
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Clear the form (especially the password) after a successful create.
  useEffect(() => {
    if (state?.ok) {
      setName("");
      setEmail("");
      setPassword("");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Name" name="name" error={fe.name}>
        <input id="name" name="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={`field ${fe.name ? "field-error" : ""}`} />
      </Field>
      <Field label="Email" name="email" error={fe.email}>
        <input id="email" name="email" type="email" autoComplete="off" required value={email} onChange={(e) => setEmail(e.target.value)} className={`field ${fe.email ? "field-error" : ""}`} />
      </Field>
      <Field label="Temporary password" name="password" error={fe.password} hint="At least 8 characters. Share it with them securely.">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`field ${fe.password ? "field-error" : ""}`}
        />
      </Field>
      <SubmitButton pendingText="Creating…">Create Pasabuyer account</SubmitButton>
    </form>
  );
}

export function RemovePasabuyerButton({ id, name }: { id: string; name: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        onClick={() => {
          if (!window.confirm(`Remove ${name}'s account? They will no longer be able to sign in.`)) return;
          setError(null);
          start(async () => {
            const res = await deletePasabuyer(id);
            if (res?.error) setError(res.error);
          });
        }}
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
