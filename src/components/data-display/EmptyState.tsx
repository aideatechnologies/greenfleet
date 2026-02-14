"use client";

import Link from "next/link";
import { Lock, PackageOpen, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "secondary";
}

interface EmptyStateProps {
  /** Title text */
  title: string;
  /** Optional description */
  description?: string;
  /** Icon to display — defaults to PackageOpen for action/info, Lock for permission */
  icon?: LucideIcon;
  /** Empty state variant */
  variant: "action" | "info" | "permission";
  /** Action buttons (only used with "action" variant) */
  actions?: EmptyStateAction[];
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * EmptyState - Displayed when a section has no content.
 *
 * Variants:
 * - action: 1-2 CTA buttons to guide the user
 * - info: Informational text only (e.g. "no results for filters")
 * - permission: Access denied message with Lock icon
 */
export function EmptyState({
  title,
  description,
  icon,
  variant,
  actions,
  className,
}: EmptyStateProps) {
  // Resolve icon based on variant
  const Icon =
    icon ?? (variant === "permission" ? Lock : PackageOpen);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>

      <h3 className="text-h3 text-foreground">{title}</h3>

      {description && (
        <p className="mt-1 max-w-sm text-body text-muted-foreground">
          {description}
        </p>
      )}

      {variant === "action" && actions && actions.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actions.map((action) => {
            const buttonVariant =
              action.variant === "secondary" ? "secondary" : "default";

            if (action.href) {
              return (
                <Button
                  key={action.label}
                  variant={buttonVariant}
                  asChild
                >
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              );
            }

            return (
              <Button
                key={action.label}
                variant={buttonVariant}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      )}

      {variant === "permission" && (
        <p className="mt-4 text-small text-muted-foreground">
          Non hai accesso a questa sezione. Contatta il tuo amministratore.
        </p>
      )}
    </div>
  );
}
