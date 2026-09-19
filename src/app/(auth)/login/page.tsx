import { LoginForm } from "@/components/auth/AuthForms";

export const metadata = { title: "Sign in — Calico Cove" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-neutral-500">Sign in to manage your pasabuy orders.</p>
      <LoginForm signupEnabled={process.env.ALLOW_SIGNUP !== "false"} />
    </>
  );
}
