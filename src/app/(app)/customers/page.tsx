import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HiddenAddress } from "@/components/customers/HiddenAddress";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { IconPlus } from "@/components/ui/icons";
import { keepPerPage, loadPage } from "@/lib/pagination";
import { cleanSearch, containsRegex } from "@/lib/search";

export const metadata = { title: "Client Information" };

type Row = { id: string; name: string; shipping_address: string };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; perPage?: string }> }) {
  const sp = await searchParams;
  const q = cleanSearch(sp.q);
  const supabase = await createClient();

  // Search matches names only.
  const [, { rows: customers, paging, failed }] = await Promise.all([
    requireOwner(),
    loadPage<Row>(sp, ({ from, to }) => {
      let query = supabase.from("customers").select("id, name, shipping_address", { count: "exact" });
      if (q) query = query.filter("name", "imatch", containsRegex(q));
      return query.order("name").order("id").range(from, to);
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Client Information"
        search={{ action: "/customers", defaultValue: q.toLowerCase(), placeholder: "Search customer name…", hidden: keepPerPage(sp.perPage) }}
        actions={
          <Link href="/customers/new" className="btn-primary shrink-0">
            <IconPlus /> Add customer
          </Link>
        }
      />

      {failed ? (
        <p role="alert" className="text-sm text-red-700">
          Couldn&apos;t load customers. Please refresh.
        </p>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-14 text-center text-neutral-500">
          {q ? "No customers match your search." : "No customers yet."}
        </div>
      ) : (
        <>
          <div className="md:overflow-hidden md:rounded-2xl md:border md:border-neutral-200 md:bg-white">
            <table className="block w-full text-left text-sm md:table">
              <thead className="hidden bg-neutral-100/70 text-neutral-500 md:table-header-group">
                <tr>
                  <th scope="col" className="w-1/3 px-4 py-3.5 font-medium">
                    Customer Name
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-medium">
                    Address
                  </th>
                </tr>
              </thead>
              <tbody className="block space-y-3 md:table-row-group md:space-y-0 md:divide-y md:divide-neutral-100">
                {customers.map((c) => (
                  <tr key={c.id} className="card block p-4 md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0">
                    <td className="block md:table-cell md:px-4 md:py-3.5 md:align-top">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-display text-base font-semibold hover:text-accent-dark md:font-sans md:text-sm md:font-medium md:hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="mt-2 block md:mt-0 md:table-cell md:px-4 md:py-3 md:align-top">
                      <p className="mb-0.5 text-xs text-neutral-500 md:hidden">Address</p>
                      <HiddenAddress address={c.shipping_address} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination paging={paging} basePath="/customers" params={q ? { q } : {}} />
        </>
      )}
    </>
  );
}
