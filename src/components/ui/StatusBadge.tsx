import { STATUS_LABEL, type ItemStatus } from "@/lib/types";

const STYLES: Record<ItemStatus, string> = {
  SECURED: "bg-violet-50 text-violet-700 ring-violet-200",
  JP_ADDRESS: "bg-amber-50 text-amber-700 ring-amber-200",
  ONHAND: "bg-sky-50 text-sky-700 ring-sky-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Small indicators (Secured · Onhand · JP Address · Packed · Delivered); lit when true. */
export function StatusIndicators({ status, secured }: { status: ItemStatus; secured: boolean }) {
  const dots: { label: string; on: boolean; on_cls: string }[] = [
    { label: "Secured", on: status === "SECURED", on_cls: "bg-violet-50 text-violet-700 ring-violet-200" },
    { label: "Onhand", on: status === "ONHAND", on_cls: "bg-sky-50 text-sky-700 ring-sky-200" },
    { label: "JP Address", on: status === "JP_ADDRESS", on_cls: "bg-amber-50 text-amber-700 ring-amber-200" },
    { label: "Packed", on: secured, on_cls: "bg-accent-soft text-accent-dark ring-accent/30" },
    { label: "Delivered", on: status === "DELIVERED", on_cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  ];
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Status">
      {dots.map((d) => (
        <li
          key={d.label}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
            d.on ? d.on_cls : "bg-neutral-50 text-neutral-300 ring-neutral-100"
          }`}
        >
          {d.label}
        </li>
      ))}
    </ul>
  );
}
