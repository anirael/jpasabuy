import { IconSearch } from "@/components/ui/icons";

export function SearchBar({
  action,
  defaultValue,
  placeholder = "Search customer, item, notes…",
  wide = false,
  hidden,
}: {
  action: string;
  defaultValue?: string;
  placeholder?: string;
  wide?: boolean;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} role="search" className={`relative w-full ${wide ? "sm:w-72 lg:w-[290px]" : "sm:w-64"}`}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-accent-dark" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label="Search"
        maxLength={100}
        className="w-full rounded-full border border-neutral-200 bg-white py-2.5 pl-11 pr-4 text-sm placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </form>
  );
}
