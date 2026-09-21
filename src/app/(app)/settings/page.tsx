import { cookies } from "next/headers";
import { getCompany, requireProfile } from "@/lib/auth";
import { getTheme, THEME_COOKIE } from "@/lib/themes";
import { CompanyNameForm, LogoPicker } from "@/components/settings/CompanySettings";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const current = getTheme((await cookies()).get(THEME_COOKIE)?.value);
  const isOwner = profile.role === "OWNER";
  const company = isOwner ? await getCompany() : null;

  return (
    <>
      <PageHeader title="Settings" subtitle="Personalize how the app looks." />

      <div className="max-w-3xl space-y-10">
        {company && (
          <section aria-labelledby="company" className="space-y-6">
            <div>
              <h2 id="company" className="font-display text-base font-semibold">
                Company
              </h2>
              <p className="mt-1 text-sm text-neutral-500">Owner only. The name and icon appear in the sidebar for your whole team.</p>
            </div>
            <div className="card p-5">
              <CompanyNameForm name={company.name} />
            </div>
            <div className="card p-5">
              <h3 className="mb-3 font-display text-sm font-semibold">Icon</h3>
              <LogoPicker current={company.logo} />
            </div>
          </section>
        )}

        <section aria-labelledby="themes">
          <h2 id="themes" className="font-display text-base font-semibold">
            Themes
          </h2>
          <p className="mb-4 mt-1 text-sm text-neutral-500">
            Each theme uses its darkest colors for the sidebar, its mid colors for buttons and highlights, and its lightest colors for backgrounds. Saved on this device.
          </p>
          <ThemePicker currentId={current.id} />
        </section>
      </div>
    </>
  );
}
