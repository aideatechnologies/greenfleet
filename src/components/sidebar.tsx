"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowRightLeft,
  Atom,
  BarChart3,
  Building2,
  Calculator,
  Car,
  ClipboardList,
  Database,
  FileCheck,
  FileText,
  Fuel,
  Gauge,
  Home,
  Leaf,
  List,
  ScrollText,
  Target,
  UserCog,
  Users,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SidebarProps = {
  user: { name: string; email: string };
  role: string | null;
  isAdmin: boolean;
  currentOrgName?: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[] | "all";
};

type NavSection = {
  label: string;
  items: NavItem[];
};

// ---------------------------------------------------------------------------
// Navigation sections (grouped as per design system spec)
// ---------------------------------------------------------------------------

const navSections: NavSection[] = [
  {
    label: "",
    items: [
      { label: "Dashboard", href: "/", icon: Home, roles: "all" },
    ],
  },
  {
    label: "Operativita",
    items: [
      { label: "Veicoli", href: "/vehicles", icon: Car, roles: ["owner", "admin"] },
      { label: "Contratti", href: "/contracts", icon: FileText, roles: ["owner", "admin"] },
      { label: "Stato Contrattuale", href: "/contracts/status", icon: FileCheck, roles: ["owner", "admin"] },
      { label: "Dipendenti", href: "/dipendenti", icon: Users, roles: ["owner", "admin"] },
      { label: "Carlist", href: "/carlist", icon: List, roles: ["owner", "admin"] },
    ],
  },
  {
    label: "Dati",
    items: [
      { label: "Rifornimenti", href: "/fuel-records", icon: Fuel, roles: ["owner", "admin", "member"] },
      { label: "Rilevazioni Km", href: "/km-readings", icon: Gauge, roles: ["owner", "admin", "member"] },
    ],
  },
  {
    label: "Analisi",
    items: [
      { label: "Stato Flotta", href: "/fleet", icon: ClipboardList, roles: ["owner", "admin"] },
      { label: "Emissioni", href: "/emissions", icon: BarChart3, roles: ["owner", "admin"] },
      { label: "Target Emissioni", href: "/emissions/targets", icon: Target, roles: ["owner", "admin"] },
    ],
  },
  {
    label: "Configurazione",
    items: [
      { label: "Utenti", href: "/settings/users", icon: UserCog, roles: ["owner", "admin"] },
      { label: "Conversione WLTP/NEDC", href: "/settings/emission-standards", icon: Calculator, roles: ["owner", "admin"] },
      { label: "Macro Tipi", href: "/settings/macro-fuel-types", icon: Fuel, roles: ["owner", "admin"] },
      { label: "Mappatura Carburanti", href: "/settings/fuel-type-mappings", icon: ArrowRightLeft, roles: ["owner", "admin"] },
      { label: "GWP", href: "/settings/gwp-config", icon: Atom, roles: ["owner", "admin"] },
      { label: "Fattori Emissione", href: "/settings/emission-factors", icon: Leaf, roles: ["owner", "admin"] },
      { label: "Tenant", href: "/settings/tenant", icon: Building2, roles: ["owner"] },
      { label: "Catalogo InfoCar", href: "/settings/catalog-import", icon: Database, roles: ["owner"] },
      { label: "Audit Log", href: "/settings/audit-log", icon: ScrollText, roles: ["owner"] },
      { label: "Metriche", href: "/settings/metrics", icon: Activity, roles: ["owner"] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNavItemVisible(item: NavItem, role: string | null, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (item.roles === "all") return true;
  if (!role) return false;
  return item.roles.includes(role);
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href;
}

// ---------------------------------------------------------------------------
// Desktop Sidebar (always expanded)
// ---------------------------------------------------------------------------

export function Sidebar({ user, role, isAdmin, currentOrgName }: SidebarProps) {
  const pathname = usePathname();

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isNavItemVisible(item, role, isAdmin)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <Leaf className="size-4.5 text-primary-foreground" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-lg font-bold leading-tight tracking-tight text-sidebar-foreground">
            Greenfleet
          </span>
          {currentOrgName && (
            <span className="truncate text-xs text-sidebar-foreground/50">
              {currentOrgName}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Navigazione principale"
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
      >
        {visibleSections.map((section, sectionIndex) => (
          <div key={section.label || `section-${sectionIndex}`}>
            {sectionIndex > 0 && section.label && (
              <>
                <Separator className="my-3 bg-sidebar-border" />
                <div className="mb-2 px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {section.label}
                  </span>
                </div>
              </>
            )}

            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-primary-soft text-primary font-semibold"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <Icon
                      className={cn(
                        "size-[18px] shrink-0 transition-colors duration-200",
                        active
                          ? "text-primary"
                          : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-primary">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/50">
              {user.email}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Mobile sidebar content (used inside Sheet)
// ---------------------------------------------------------------------------

export function SidebarMobileContent({
  user,
  role,
  isAdmin,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isNavItemVisible(item, role, isAdmin)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <Leaf className="size-4.5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight">Greenfleet</span>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Navigazione principale"
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
      >
        {visibleSections.map((section, sectionIndex) => (
          <div key={section.label || `section-${sectionIndex}`}>
            {sectionIndex > 0 && section.label && (
              <>
                <Separator className="my-3" />
                <div className="mb-2 px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                    {section.label}
                  </span>
                </div>
              </>
            )}

            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground/70 hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <Icon
                      className={cn(
                        "size-[18px] shrink-0 transition-colors duration-200",
                        active
                          ? "text-primary"
                          : "text-foreground/50 group-hover:text-foreground/80"
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
