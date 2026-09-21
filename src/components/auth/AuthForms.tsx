"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, signup } from "@/app/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { IconArrowRight, IconEye, IconEyeOff, IconLock, IconMail } from "@/components/ui/icons";

export function LoginForm({ signupEnabled }: { signupEnabled: boolean }) {
  const [state, action] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="Email" name="email" error={fe.email}>
        <div className="group relative">
          <IconMail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-accent" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            className={`field py-3 pl-11 ${fe.email ? "field-error" : ""}`}
          />
        </div>
      </Field>
      <Field label="Password" name="password" error={fe.password}>
        <div className="group relative">
          <IconLock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-accent" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            className={`field py-3 pl-11 pr-11 ${fe.password ? "field-error" : ""}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {showPassword ? <IconEyeOff className="h-[18px] w-[18px]" /> : <IconEye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </Field>
      <SubmitButton pendingText="Signing in…" className="btn-primary group w-full py-3 shadow-lg shadow-accent/25">
        Sign in
        <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </SubmitButton>
      {signupEnabled && (
        <p className="border-t border-neutral-200 pt-5 text-center text-sm text-neutral-500">
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
