import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreatePasabuyerForm, RemovePasabuyerButton } from "@/components/team/TeamForms";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Team — Calico Cove" };

export default async function TeamPage() {
  const owner = await requireOwner();
  const supabase = await createClient();
  // RLS: an Owner only sees profiles of their own company.
  const { data } = await supabase.from("profiles").select("id, company_id, name, email, role").order("role").order("name");
  const people = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader title="Team" subtitle="Pasabuyers can only view items that are Onhand; no prices, no customers." />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="members">
          <h2 id="members" className="mb-3 font-display text-base font-semibold">
            Accounts in your business
          </h2>
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {p.name} {p.id === owner.id && <span className="text-xs text-neutral-400">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-neutral-500">{p.email}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    p.role === "OWNER" ? "bg-accent-soft text-accent-dark ring-accent/30" : "bg-neutral-50 text-neutral-600 ring-neutral-200"
                  }`}
                >
                  {p.role === "OWNER" ? "Owner" : "Pasabuyer"}
                </span>
                {p.role === "PASABUYER" && <RemovePasabuyerButton id={p.id} name={p.name} />}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="add" className="card self-start p-5">
          <h2 id="add" className="mb-4 font-display text-base font-semibold">
            Add a Pasabuyer
          </h2>
          <CreatePasabuyerForm />
        </section>
      </div>
    </>
  );
}
