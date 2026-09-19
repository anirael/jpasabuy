"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/ui/Brand";
import {
  IconChevron,
  IconClients,
  IconClose,
  IconDashboard,
  IconInventory,
  IconLogout,
  IconMenu,
  IconSettings,
  IconTeam,
} from "@/components/ui/icons";
import { Avatar } from "@/components/ui/Avatar";
import type { Role } from "@/lib/types";

const INVENTORY_LINKS = [
  { label: "Secured", status: "SECURED" },
  { label: "Japan Address", status: "JP_ADDRESS" },
  { label: "Onhand", status: "ONHAND" },
  { label: "Delivered", status: "DELIVERED" },
];

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-full px-5 py-2.5 font-display text-[15px] transition ${
        active ? "bg-sidebar-active text-sidebar-activeink" : "text-sidebar-text hover:bg-white/5 hover:text-sidebar-hover"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="leading-tight">{children}</span>
    </Link>
  );
}

type Company = { name: string; logo: string };

function SidebarContent({ role, company, onNavigate }: { role: Role; company: Company; onNavigate: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const isOwner = role === "OWNER";
  const inInventory = pathname.startsWith("/inventory");
  const currentStatus = params.get("status") ?? "SECURED";
  const [open, setOpen] = useState(inInventory);

  useEffect(() => {
    if (inInventory) setOpen(true);
  }, [inInventory]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-7">
        <Logo name={company.name} logo={company.logo} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3" onClick={onNavigate}>
        {isOwner && (
          <NavLink href="/dashboard" active={pathname.startsWith("/dashboard")} icon={<IconDashboard />}>
            Dashboard
          </NavLink>
        )}

        {isOwner ? (
          <div
            className={`flex items-center rounded-full pr-3 transition ${
              inInventory ? "bg-sidebar-active text-sidebar-activeink" : "text-sidebar-text hover:bg-white/5 hover:text-sidebar-hover"
            }`}
          >
            <Link
              href="/inventory"
              aria-current={inInventory ? "page" : undefined}
              className="flex flex-1 items-center gap-3 py-2.5 pl-5 font-display text-[15px]"
            >
              <IconInventory />
              Inventory
            </Link>
            <button
              type="button"
              aria-label={open ? "Collapse inventory" : "Expand inventory"}
              aria-expanded={open}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((o) => !o);
              }}
              className="rounded-full p-1.5"
            >
              <IconChevron className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
            </button>
          </div>
        ) : (
          <NavLink href="/inventory" active={inInventory} icon={<IconInventory />}>
            Inventory
          </NavLink>
        )}

        {isOwner && (
          <>
            <div className={`space-y-0.5 pb-1 pl-[3.25rem] ${open ? "" : "hidden"}`}>
              {INVENTORY_LINKS.map((l) => {
                const active = inInventory && pathname === "/inventory" && currentStatus === l.status;
                return (
                  <Link
                    key={l.status}
                    href={`/inventory?status=${l.status}`}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-lg py-1.5 font-display text-[15px] transition ${
                      active ? "font-semibold text-sidebar-hover" : "text-sidebar-text hover:text-sidebar-hover"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
            <NavLink href="/customers" active={pathname.startsWith("/customers")} icon={<IconClients />}>
              Client Information
            </NavLink>
            <NavLink href="/team" active={pathname.startsWith("/team")} icon={<IconTeam />}>
              Team
            </NavLink>
          </>
        )}
      </nav>

      <div className="space-y-1 px-3 pb-6 pt-3" onClick={onNavigate}>
        <NavLink href="/settings" active={pathname.startsWith("/settings")} icon={<IconSettings />}>
          Settings
        </NavLink>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-full px-5 py-2.5 font-display text-[15px] text-sidebar-text transition hover:bg-white/5 hover:text-sidebar-hover"
          >
            <IconLogout />
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({ role, name, company, children }: { role: Role; name: string; company: Company; children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <div className="min-h-screen bg-page">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[222px] bg-sidebar lg:block">
        <SidebarContent role={role} company={company} onNavigate={() => {}} />
      </aside>

      {/* Mobile top bar with burger */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-sidebar px-4 py-3 shadow-sm lg:hidden">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Open menu"
          className="-ml-1 rounded-lg p-1.5 text-sidebar-hover hover:bg-white/10"
        >
          <IconMenu />
        </button>
        <Logo name={company.name} logo={company.logo} />
        <div className="ml-auto shrink-0">
          <Avatar name={name} size="sm" />
        </div>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[268px] max-w-[85vw] bg-sidebar shadow-xl">
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-sidebar-text hover:bg-white/10 hover:text-sidebar-hover"
            >
              <IconClose />
            </button>
            <SidebarContent role={role} company={company} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-[222px]">
        <div className="px-4 pb-16 pt-6 sm:px-8 lg:px-10 lg:pt-10">{children}</div>
      </main>
    </div>
  );
}

