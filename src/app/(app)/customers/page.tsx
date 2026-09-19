import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HiddenAddress } from "@/components/customers/HiddenAddress";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconPlus } from "@/components/ui/icons";

export const metadata = { title: "Client Information — Calico Cove" };

type Row = { id: string; name: string; shipping_address: string };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireOwner();
  const q = ((await searchParams).q ?? "").trim().slice(0, 100).toLowerCase();
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").select("id, name, shipping_address").order("name").limit(1000);

  let customers = (data ?? []) as Row[];
  // Search matches names only, so a search can never be used to probe hidden addresses.
  if (q) customers = customers.filter((c) => c.name.toLowerCase().includes(q));

  return (
    <>
      <PageHeader
        title="Client Information"
        search={{ action: "/customers", defaultValue: q, placeholder: "Search customer name…" }}
        actions={
          <Link href="/customers/new" className="btn-primary shrink-0">
            <IconPlus /> Add customer
          </Link>
        }
      />

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          Couldn&apos;t load customers. Please refresh.
        </p>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-14 text-center text-neutral-500">
          {q ? "No customers match your search." : "No customers yet."}
        </div>
      ) : (
        <>
          {/* Tablet / desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-100/70 text-neutral-500">
                <tr>
                  <th scope="col" className="w-1/3 px-4 py-3.5 font-medium">
                    Customer Name
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-medium">
                    Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3.5 align-top">
                      <Link href={`/customers/${c.id}`} className="font-medium hover:text-accent-dark hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <HiddenAddress address={c.shipping_address} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <ul className="space-y-3 md:hidden">
            {customers.map((c) => (
              <li key={c.id} className="card p-4">
                <Link href={`/customers/${c.id}`} className="font-display text-base font-semibold hover:text-accent-dark">
                  {c.name}
                </Link>
                <div className="mt-2 text-sm">
                  <p className="mb-0.5 text-xs text-neutral-500">Address</p>
                  <HiddenAddress address={c.shipping_address} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
