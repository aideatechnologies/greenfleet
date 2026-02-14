"use client";

import { Building2, Clock, CalendarRange, Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ContractType,
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPE_DESCRIPTIONS,
} from "@/types/contract";
import type { LucideIcon } from "lucide-react";

const CONTRACT_TYPE_ICONS: Record<ContractType, LucideIcon> = {
  PROPRIETARIO: Building2,
  BREVE_TERMINE: Clock,
  LUNGO_TERMINE: CalendarRange,
  LEASING_FINANZIARIO: Landmark,
};

type ContractTypeSelectorProps = {
  selected?: ContractType;
  onSelect: (type: ContractType) => void;
};

export function ContractTypeSelector({
  selected,
  onSelect,
}: ContractTypeSelectorProps) {
  const types = Object.values(ContractType);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {types.map((type) => {
        const Icon = CONTRACT_TYPE_ICONS[type];
        const isSelected = selected === type;

        return (
          <Card
            key={type}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:border-muted-foreground/30"
            )}
            onClick={() => onSelect(type)}
          >
            <CardContent className="flex items-start gap-4 pt-6">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">
                  {CONTRACT_TYPE_LABELS[type]}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {CONTRACT_TYPE_DESCRIPTIONS[type]}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
