import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Create your business — Calico Cove" };

export default function SignupPage() {
  if (process.env.ALLOW_SIGNUP === "false") redirect("/login");
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Create your business</h1>
      <p className="mb-6 mt-1 text-sm text-neutral-500">You&apos;ll be the Owner. You can add Pasabuyer accounts afterwards.</p>
      <SignupForm />
    </>
  );
}
