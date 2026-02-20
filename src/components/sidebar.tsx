"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Activity,
  ArrowRightLeft,
  Atom,
  BarChart3,
  Building2,
  Calculator,
  Car,
  ClipboardList,
  CreditCard,
  Database,
  FileCheck,
  FileText,
  FileUp,
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

type NavItemDef = {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  roles: string[] | "all";
};

type NavSectionDef = {
  labelKey: string;
  items: NavItemDef[];
};

// ---------------------------------------------------------------------------
// Navigation sections (translation keys)
// ---------------------------------------------------------------------------

const navSectionDefs: NavSectionDef[] = [
  {
    labelKey: "",
    items: [
      { labelKey: "dashboard", href: "/", icon: Home, roles: "all" },
    ],
  },
  {
    labelKey: "data",
    items: [
      { labelKey: "vehicles", href: "/vehicles", icon: Car, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "contracts", href: "/contracts", icon: FileText, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "contractStatus", href: "/contracts/status", icon: FileCheck, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "employees", href: "/dipendenti", icon: Users, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "fuelCards", href: "/fuel-cards", icon: CreditCard, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "carlist", href: "/carlist", icon: List, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "suppliers", href: "/settings/suppliers", icon: Building2, roles: ["owner", "admin", "mobility_manager"] },
    ],
  },
  {
    labelKey: "operations",
    items: [
      { labelKey: "fuelRecords", href: "/fuel-records", icon: Fuel, roles: ["owner", "admin", "mobility_manager", "member"] },
      { labelKey: "kmReadings", href: "/km-readings", icon: Gauge, roles: ["owner", "admin", "mobility_manager", "member"] },
      { labelKey: "invoiceImport", href: "/fuel-records/import-xml", icon: FileUp, roles: ["owner", "admin", "mobility_manager"] },
    ],
  },
  {
    labelKey: "analysis",
    items: [
      { labelKey: "fleetStatus", href: "/fleet", icon: ClipboardList, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "emissions", href: "/emissions", icon: BarChart3, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "emissionTargets", href: "/emissions/targets", icon: Target, roles: ["owner", "admin", "mobility_manager"] },
    ],
  },
  {
    labelKey: "configuration",
    items: [
      { labelKey: "users", href: "/settings/users", icon: UserCog, roles: ["owner", "admin"] },
      { labelKey: "wltpConversion", href: "/settings/emission-standards", icon: Calculator, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "macroTypes", href: "/settings/macro-fuel-types", icon: Fuel, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "fuelMapping", href: "/settings/fuel-type-mappings", icon: ArrowRightLeft, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "gwp", href: "/settings/gwp-config", icon: Atom, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "emissionFactors", href: "/settings/emission-factors", icon: Leaf, roles: ["owner", "admin", "mobility_manager"] },
      { labelKey: "tenant", href: "/settings/tenant", icon: Building2, roles: ["owner"] },
      { labelKey: "catalogInfoCar", href: "/settings/catalog-import", icon: Database, roles: ["owner"] },
      { labelKey: "auditLog", href: "/settings/audit-log", icon: ScrollText, roles: ["owner"] },
      { labelKey: "metrics", href: "/settings/metrics", icon: Activity, roles: ["owner"] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNavItemVisible(item: NavItemDef, role: string | null, isAdmin: boolean): boolean {
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
// Desktop Sidebar
// ---------------------------------------------------------------------------

export function Sidebar({ user, role, isAdmin, currentOrgName }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const visibleSections = navSectionDefs
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isNavItemVisible(item, role, isAdmin)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen w-64 shrink-0 md:flex md:flex-col",
        // Light mode
        "bg-white border-r border-gray-200/80",
        // Dark mode — glass panel
        "dark:bg-[#0B1120] dark:border-r dark:border-r-[rgba(255,255,255,0.08)]"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200/80 dark:border-b-[rgba(255,255,255,0.08)] px-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#22C55E] shadow-lg shadow-[#22C55E]/25">
          <Leaf className="size-5 text-white" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-lg font-bold leading-tight tracking-tight">
            Greenfleet
          </span>
          {currentOrgName && (
            <span className="truncate text-[11px] text-muted-foreground">
              {currentOrgName}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav
        aria-label={t("mainNavigation")}
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4"
      >
        {visibleSections.map((section, sectionIndex) => (
          <div key={section.labelKey || `section-${sectionIndex}`}>
            {sectionIndex > 0 && section.labelKey && (
              <>
                <div className="my-3 h-px bg-gray-200/80 dark:bg-[rgba(255,255,255,0.06)]" />
                <div className="mb-2 px-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                    {t(section.labelKey as "operations")}
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
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
                      active
                        ? "bg-primary/10 text-primary font-semibold dark:bg-[rgba(34,197,94,0.12)] dark:text-[#86EFAC]"
                        : "text-foreground/55 hover:bg-muted hover:text-foreground dark:text-[#94A3B8] dark:hover:bg-[rgba(255,255,255,0.04)] dark:hover:text-white"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary dark:bg-[#86EFAC] dark:shadow-[0_0_10px_rgba(134,239,172,0.5)]" />
                    )}
                    <Icon
                      className={cn(
                        "size-[18px] shrink-0 transition-colors duration-200",
                        active
                          ? "text-primary dark:text-[#86EFAC]"
                          : "text-foreground/35 group-hover:text-foreground/65 dark:text-[#94A3B8]/60 dark:group-hover:text-white/80"
                      )}
                    />
                    <span className="truncate">{t(item.labelKey as "dashboard")}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-gray-200/80 dark:border-t-[rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary dark:bg-[rgba(134,239,172,0.1)] dark:text-[#86EFAC]">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">
              {user.name}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
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
  const t = useTranslations("nav");

  const visibleSections = navSectionDefs
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isNavItemVisible(item, role, isAdmin)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#22C55E] shadow-lg shadow-[#22C55E]/25">
          <Leaf className="size-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">Greenfleet</span>
      </div>

      {/* Navigation */}
      <nav
        aria-label={t("mainNavigation")}
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4"
      >
        {visibleSections.map((section, sectionIndex) => (
          <div key={section.labelKey || `section-${sectionIndex}`}>
            {sectionIndex > 0 && section.labelKey && (
              <>
                <div className="my-3 h-px bg-border dark:bg-[rgba(255,255,255,0.06)]" />
                <div className="mb-2 px-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                    {t(section.labelKey as "operations")}
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
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground/55 hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <Icon
                      className={cn(
                        "size-[18px] shrink-0 transition-colors duration-200",
                        active
                          ? "text-primary"
                          : "text-foreground/35 group-hover:text-foreground/65"
                      )}
                    />
                    <span>{t(item.labelKey as "dashboard")}</span>
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
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
