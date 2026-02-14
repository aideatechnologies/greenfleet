"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

// ---------------------------------------------------------------------------
// Route label mappings
// ---------------------------------------------------------------------------

const ROUTE_LABELS: Record<string, string> = {
  vehicles: "Veicoli",
  contracts: "Contratti",
  status: "Stato Contrattuale",
  dipendenti: "Dipendenti",
  employees: "Dipendenti",
  carlist: "Carlist",
  "fuel-records": "Rifornimenti",
  "km-readings": "Rilevazioni Km",
  fleet: "Stato Flotta",
  emissions: "Emissioni",
  report: "Report",
  settings: "Impostazioni",
  users: "Utenti",
  "emission-factors": "Standard Emissioni",
  tenant: "Tenant",
  profile: "Profilo",
  new: "Nuovo",
  edit: "Modifica",
};

function getSegmentLabel(segment: string): string {
  return ROUTE_LABELS[segment] ?? decodeURIComponent(segment);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Breadcrumb — Auto-generated from the current pathname.
 * Every segment except the last is a clickable link.
 * Uses semantic nav + ol markup with aria-label.
 */
export function Breadcrumb() {
  const pathname = usePathname();

  // Split pathname and filter empty segments
  const segments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumb on root/dashboard
  if (segments.length === 0) {
    return null;
  }

  // Build breadcrumb items
  const items = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = getSegmentLabel(segment);
    const isLast = index === segments.length - 1;
    // Detect UUIDs or numeric IDs (skip showing ugly IDs in breadcrumb label)
    const isId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment) ||
      /^\d+$/.test(segment);

    return {
      href,
      label: isId ? "Dettaglio" : label,
      isLast,
    };
  });

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1 text-sm">
        {/* Home / Dashboard always first */}
        <li className="flex items-center">
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dashboard"
          >
            <Home className="size-3.5" />
          </Link>
        </li>

        {items.map((item) => (
          <Fragment key={item.href}>
            <li aria-hidden="true" className="flex items-center text-muted-foreground/50">
              <ChevronRight className="size-3" />
            </li>
            <li className="flex min-w-0 items-center">
              {item.isLast ? (
                <span
                  className="truncate font-medium text-foreground"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
