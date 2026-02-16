"use client";

import Link from "next/link";
import { Bell, FileText, ScrollText, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { EmptyState } from "@/components/data-display/EmptyState";
import { cn } from "@/lib/utils";
import type { DashboardNotifications } from "@/lib/services/dashboard-service";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NotificationPanelProps {
  notifications: DashboardNotifications;
  className?: string;
}

// ---------------------------------------------------------------------------
// Severity to StatusBadge variant mapping
// ---------------------------------------------------------------------------

const SEVERITY_VARIANT: Record<string, "warning" | "destructive" | "info"> = {
  warning: "warning",
  destructive: "destructive",
  info: "info",
};

// ---------------------------------------------------------------------------
// NotificationItem
// ---------------------------------------------------------------------------

function NotificationItem({
  title,
  description,
  severity,
  link,
}: {
  title: string;
  description: string;
  severity: string;
  link: string;
}) {
  return (
    <Link
      href={link}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
          {title}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <StatusBadge
            label={description}
            variant={SEVERITY_VARIANT[severity] ?? "warning"}
            size="sm"
            showDot
          />
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// NotificationGroup
// ---------------------------------------------------------------------------

function NotificationGroup({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ElementType;
  items: Array<{
    id: number;
    title: string;
    description: string;
    severity: string;
    link: string;
  }>;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {items.length}
        </Badge>
      </div>
      <div className="flex flex-col">
        {items.map((item) => (
          <NotificationItem
            key={item.id}
            title={item.title}
            description={item.description}
            severity={item.severity}
            link={item.link}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * NotificationPanel - Displays categorized notifications for the Fleet Manager.
 *
 * Groups:
 * - Contratti in scadenza (with severity badges)
 * - Documenti in scadenza (with severity badges)
 *
 * Each notification is clickable and navigates to the related detail page.
 */
export function NotificationPanel({
  notifications,
  className,
}: NotificationPanelProps) {
  const { contracts, documents, total } = notifications;

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-primary" aria-hidden="true" />
          <CardTitle className="text-base">Notifiche</CardTitle>
          {total > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">
              {total}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-3">
        {total === 0 ? (
          <EmptyState
            title="Nessuna notifica"
            description="Non ci sono scadenze imminenti"
            icon={Bell}
            variant="info"
            className="py-8"
          />
        ) : (
          <div className="flex flex-col gap-4">
            <NotificationGroup
              title="Contratti in scadenza"
              icon={ScrollText}
              items={contracts}
            />
            <NotificationGroup
              title="Documenti in scadenza"
              icon={FileText}
              items={documents}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
