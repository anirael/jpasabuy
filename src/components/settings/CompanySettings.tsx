"use client";

import { useActionState, useState, useTransition } from "react";
import { updateCompanyLogo, updateCompanyName } from "@/app/actions/settings";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { LogoMark } from "@/components/ui/Brand";
import { LOGOS } from "@/lib/logos";

export function CompanyNameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateCompanyName, null);
  const [value, setValue] = useState(name);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Company name" name="name" error={fe.name} hint="Shown at the top of the sidebar for everyone in your company.">
        <input id="name" name="name" required maxLength={60} value={value} onChange={(e) => setValue(e.target.value)} className={`field ${fe.name ? "field-error" : ""}`} />
      </Field>
      <SubmitButton pendingText="Saving…">Save name</SubmitButton>
    </form>
  );
}

export function LogoPicker({ current }: { current: string }) {
  const [selected, setSelected] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function choose(id: string) {
    if (id === selected) return;
    const previous = selected;
    setError(null);
    setSelected(id);
    start(async () => {
      const res = await updateCompanyLogo(id);
      if (!res.ok) {
        setSelected(previous);
        setError(res.error ?? "Could not save the icon.");
      }
    });
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <div role="radiogroup" aria-label="Company icon" className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {LOGOS.map((l) => {
          const active = l.id === selected;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={l.label}
              title={l.label}
              disabled={pending}
              onClick={() => choose(l.id)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                active ? "border-accent bg-accent-soft" : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-sidebar">
                <LogoMark logo={l.id} className="h-9 w-9" />
              </span>
              <span className="text-xs text-neutral-600">{l.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
