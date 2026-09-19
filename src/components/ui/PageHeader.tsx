import { Avatar } from "@/components/ui/Avatar";
import { SearchBar } from "@/components/ui/SearchBar";

/**
 * Two header styles taken from the mockups:
 *  - "welcome": big greeting + subtitle + search + avatar (Dashboard)
 *  - default:   big UPPERCASE title + small search (Inventory, Customers, …)
 */
export function PageHeader({
  title,
  subtitle,
  userName,
  welcome = false,
  search,
  actions,
}: {
  title: string;
  subtitle?: string;
  userName?: string;
  welcome?: boolean;
  search?: { action: string; defaultValue?: string; placeholder?: string; hidden?: Record<string, string> };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-4 lg:mb-8">
      <div className="min-w-0 flex-1">
        <h1
          className={
            welcome
              ? "font-display text-2xl font-semibold leading-tight tracking-tight sm:text-[28px]"
              : "font-display text-3xl font-medium uppercase tracking-tight sm:text-4xl"
          }
        >
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 font-display text-sm text-neutral-500">{subtitle}</p>}
      </div>
      <div className="flex w-full items-center gap-3 sm:w-auto">
        {search && <SearchBar {...search} wide={welcome} />}
        {actions}
        {welcome && userName && (
          <span className="hidden lg:inline-flex">
            <Avatar name={userName} />
          </span>
        )}
      </div>
    </div>
  );
}
