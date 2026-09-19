import { Logo } from "@/components/ui/Brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sidebar px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl sm:p-8">{children}</div>
    </div>
  );
}
