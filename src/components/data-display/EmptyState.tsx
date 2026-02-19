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
  title: string;
  description?: string;
  icon?: LucideIcon;
  variant: "action" | "info" | "permission";
  actions?: EmptyStateAction[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  description,
  icon,
  variant,
  actions,
  className,
}: EmptyStateProps) {
  const Icon =
    icon ?? (variant === "permission" ? Lock : PackageOpen);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/80 dark:bg-muted/50">
        <Icon className="size-7 text-muted-foreground" aria-hidden="true" />
      </div>

      <h3 className="text-h3 text-foreground">{title}</h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-body text-muted-foreground">
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
