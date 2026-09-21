import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/AuthForms";
import { Logo } from "@/components/ui/Brand";

export const metadata = { title: "Create your business" };

export default function SignupPage() {
  if (process.env.ALLOW_SIGNUP === "false") redirect("/login");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl sm:p-8">
        <h1 className="font-display text-2xl font-semibold">Create your business</h1>
        <p className="mb-6 mt-1 text-sm text-neutral-500">You&apos;ll be the Owner. You can add Pasabuyer accounts afterwards.</p>
        <SignupForm />
      </div>
    </div>
  );
}
