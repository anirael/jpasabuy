import { ImageZoom } from "@/components/ui/ImageZoom";
import { IconExpand } from "@/components/ui/icons";
import type { PasabuyerItem } from "@/lib/types";

function OpenMercari({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[13px] font-semibold shadow-sm transition hover:bg-neutral-50"
    >
      <IconExpand />
      Open
    </a>
  );
}

/** Read-only, no financial fields. */
export function PasabuyerInventory({ items }: { items: PasabuyerItem[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-neutral-200 md:block">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-neutral-100/70 text-neutral-500">
            <tr>
              {["Product Image", "Item ID", "Notes"].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap px-4 py-3.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <ImageZoom src={item.image_url} />
                    {item.mercari_url && (
                      <span className="-ml-2.5">
                        <OpenMercari url={item.mercari_url} />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{item.mercari_item_id ?? "—"}</td>
                <td className="max-w-[280px] px-4 py-3 text-neutral-600">
                  <span className="line-clamp-2 whitespace-pre-line break-words">{item.notes || "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {items.map((item) => (
          <li key={item.id} className="card p-4">
            <div className="flex gap-3">
              <ImageZoom src={item.image_url} className="h-20 w-20" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-neutral-500">{item.mercari_item_id ?? "—"}</p>
              </div>
            </div>
            {item.notes && <p className="mt-3 whitespace-pre-line break-words text-sm text-neutral-600">{item.notes}</p>}
            {item.mercari_url && (
              <div className="mt-3">
                <OpenMercari url={item.mercari_url} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
