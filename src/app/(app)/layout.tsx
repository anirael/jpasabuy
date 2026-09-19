import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { getCompany, requireProfile } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, company] = await Promise.all([requireProfile(), getCompany()]);
  return (
    <Suspense>
      <AppShell role={profile.role} name={profile.name} company={company}>
        {children}
      </AppShell>
    </Suspense>
  );
}
