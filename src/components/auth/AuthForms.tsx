"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/app/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";

export function LoginForm({ signupEnabled }: { signupEnabled: boolean }) {
  const [state, action] = useActionState(login, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Email" name="email" error={fe.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className={`field ${fe.email ? "field-error" : ""}`} />
      </Field>
      <Field label="Password" name="password" error={fe.password}>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={`field ${fe.password ? "field-error" : ""}`} />
      </Field>
      <SubmitButton pendingText="Signing in…" className="btn-primary w-full">
        Sign in
      </SubmitButton>
      {signupEnabled && (
        <p className="text-center text-sm text-neutral-500">
          New Owner?{" "}
          <Link href="/signup" className="font-medium text-accent-dark hover:underline">
            Create your business
          </Link>
        </p>
      )}
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signup, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Your name" name="name" error={fe.name}>
        <input id="name" name="name" autoComplete="name" required maxLength={120} className={`field ${fe.name ? "field-error" : ""}`} />
      </Field>
      <Field label="Business name" name="companyName" error={fe.companyName}>
        <input id="companyName" name="companyName" required maxLength={120} className={`field ${fe.companyName ? "field-error" : ""}`} />
      </Field>
      <Field label="Email" name="email" error={fe.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className={`field ${fe.email ? "field-error" : ""}`} />
      </Field>
      <Field label="Password" name="password" error={fe.password} hint="At least 8 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={`field ${fe.password ? "field-error" : ""}`} />
      </Field>
      <SubmitButton pendingText="Creating…" className="btn-primary w-full">
        Create account
      </SubmitButton>
      <p className="text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent-dark hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
