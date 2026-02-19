"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fuel, Gauge, Home, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const navItems = [
  { label: "Dashboard", href: "/driver", icon: Home },
  { label: "Rifornimenti", href: "/fuel-records?mine=true", icon: Fuel },
  { label: "Km", href: "/km-readings?mine=true", icon: Gauge },
  { label: "Profilo", href: "/settings/profile", icon: User },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0];
  if (path === "/driver") return pathname === "/driver";
  return pathname === path || pathname.startsWith(path + "/");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-white/70 backdrop-blur-xl dark:bg-[rgba(15,23,42,0.8)] dark:border-t-[rgba(255,255,255,0.06)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_hsl(162_80%_45%/0.5)]")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
