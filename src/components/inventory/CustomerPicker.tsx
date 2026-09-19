"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconChevron } from "@/components/ui/icons";

type Customer = { id: string; name: string };

/**
 * Searchable customer select. Type to filter existing customers; "+ New customer…" is always the first
 * option, whatever is typed. Submits the choice as `name` ("" = none, "new" = new customer, else the id).
 */
export function CustomerPicker({
  id,
  name,
  customers,
  value,
  onChange,
  invalid,
}: {
  id: string;
  name: string;
  customers: Customer[];
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const q = query.trim().toLowerCase();
  const matches = q ? customers.filter((c) => c.name.toLowerCase().includes(q)) : customers;
  const options = [{ id: "new", name: "+ New customer…" }, ...matches];
  const selectedLabel = value === "new" ? "+ New customer…" : (customers.find((c) => c.id === value)?.name ?? "");

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function choose(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (e.key === "ArrowDown" ? Math.min(options.length - 1, a + 1) : Math.max(0, a - 1)));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      choose(options[active]?.id ?? "new");
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={value} />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Select a customer…"
        value={open ? query : selectedLabel}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(e.target.value.trim() && customers.some((c) => c.name.toLowerCase().includes(e.target.value.trim().toLowerCase())) ? 1 : 0);
        }}
        onKeyDown={onKeyDown}
        className={`field pr-9 ${invalid ? "field-error" : ""}`}
      />
      <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />

      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-neutral-200 bg-white py-1 text-sm shadow-lg">
          {options.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={o.id === value}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(o.id)}
              onPointerEnter={() => setActive(i)}
              className={`cursor-pointer px-3.5 py-2 ${o.id === "new" ? "font-medium text-accent-dark" : ""} ${i === active ? "bg-neutral-100" : ""}`}
            >
              {o.name}
            </li>
          ))}
          {matches.length === 0 && <li className="px-3.5 py-2 text-neutral-400">No matching customers</li>}
        </ul>
      )}
    </div>
  );
}
