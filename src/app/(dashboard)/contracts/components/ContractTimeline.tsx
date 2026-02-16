"use client";

import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Plus, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContractType,
  CONTRACT_TYPE_LABELS,
  ContractStatus,
  CONTRACT_STATUS_LABELS,
  type ContractType as ContractTypeT,
  type ContractStatus as ContractStatusT,
} from "@/types/contract";
import type { ContractWithDetails } from "@/lib/services/contract-service";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return "-";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

function formatDateShort(date: Date | string | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "dd MMM yyyy", { locale: it });
}

// ---------------------------------------------------------------------------
// Badge color helpers
// ---------------------------------------------------------------------------

function typeBadgeClasses(type: string): string {
  switch (type) {
    case ContractType.PROPRIETARIO:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case ContractType.BREVE_TERMINE:
      return "bg-amber-100 text-amber-800 border-amber-200";
    case ContractType.LUNGO_TERMINE:
      return "bg-purple-100 text-purple-800 border-purple-200";
    case ContractType.LEASING_FINANZIARIO:
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    default:
      return "";
  }
}

function statusBadgeVariant(
  status: string
): "default" | "secondary" {
  return status === ContractStatus.ACTIVE ? "default" : "secondary";
}

function statusBadgeClasses(status: string): string {
  return status === ContractStatus.ACTIVE
    ? "bg-green-600 hover:bg-green-600/90"
    : "bg-gray-100 text-gray-600 hover:bg-gray-100/90";
}

// ---------------------------------------------------------------------------
// Key detail line
// ---------------------------------------------------------------------------

function getSupplierName(contract: ContractWithDetails): string | null {
  return contract.supplierRef?.name ?? contract.leasingCompany ?? contract.supplier ?? null;
}

function getKeyDetail(contract: ContractWithDetails): string | null {
  const type = contract.type as ContractTypeT;
  const supplierName = getSupplierName(contract);
  switch (type) {
    case "PROPRIETARIO":
      return contract.purchasePrice != null
        ? `Acquisto: ${formatCurrency(contract.purchasePrice)}`
        : null;
    case "BREVE_TERMINE":
      return [
        supplierName ? `Fornitore: ${supplierName}` : null,
        contract.dailyRate != null
          ? `${formatCurrency(contract.dailyRate)}/giorno`
          : null,
      ]
        .filter(Boolean)
        .join(" - ") || null;
    case "LUNGO_TERMINE":
      return [
        supplierName ? `Fornitore: ${supplierName}` : null,
        contract.monthlyRate != null
          ? `${formatCurrency(contract.monthlyRate)}/mese`
          : null,
      ]
        .filter(Boolean)
        .join(" - ") || null;
    case "LEASING_FINANZIARIO":
      return [
        supplierName ?? null,
        contract.monthlyRate != null
          ? `${formatCurrency(contract.monthlyRate)}/mese`
          : null,
      ]
        .filter(Boolean)
        .join(" - ") || null;
    default:
      return null;
  }
}

function getDateRange(contract: ContractWithDetails): string {
  const type = contract.type as ContractTypeT;
  if (type === "PROPRIETARIO") {
    return contract.purchaseDate
      ? `Acquistato il ${formatDateShort(contract.purchaseDate)}`
      : "Data acquisto non disponibile";
  }
  const start = formatDateShort(contract.startDate);
  const end = formatDateShort(contract.endDate);
  return `${start} - ${end}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ContractTimelineProps = {
  contracts: ContractWithDetails[];
  vehicleId: number | string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractTimeline({
  contracts,
  vehicleId,
}: ContractTimelineProps) {
  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-4">
          Nessun contratto associato a questo veicolo.
        </p>
        <Button asChild size="sm">
          <Link href={`/contracts/new?vehicleId=${vehicleId}`}>
            <Plus className="mr-1 h-4 w-4" />
            Crea primo contratto
          </Link>
        </Button>
      </div>
    );
  }

  // Sort: ACTIVE first, then by createdAt desc
  const sorted = [...contracts].sort((a, b) => {
    if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
    if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="relative">
      {sorted.map((contract, index) => {
        const isActive = contract.status === ContractStatus.ACTIVE;
        const isLast = index === sorted.length - 1;
        const contractType = contract.type as ContractTypeT;
        const contractStatus = contract.status as ContractStatusT;
        const keyDetail = getKeyDetail(contract);
        const dateRange = getDateRange(contract);

        return (
          <div key={contract.id} className="relative flex gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full shrink-0 mt-5 ${
                  isActive
                    ? "bg-green-500 ring-4 ring-green-100"
                    : "bg-gray-300"
                }`}
              />
              {!isLast && (
                <div className="w-0.5 flex-1 bg-border" />
              )}
            </div>

            {/* Card */}
            <Link
              href={`/contracts/${contract.id}`}
              className="flex-1 mb-4 block"
            >
              <Card
                className={`transition-colors hover:bg-accent/50 cursor-pointer ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "opacity-80"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={typeBadgeClasses(contractType)}
                        >
                          {CONTRACT_TYPE_LABELS[contractType]}
                        </Badge>
                        <Badge
                          variant={statusBadgeVariant(contractStatus)}
                          className={statusBadgeClasses(contractStatus)}
                        >
                          {CONTRACT_STATUS_LABELS[contractStatus]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {dateRange}
                      </p>
                      {keyDetail && (
                        <p className="text-sm font-medium">{keyDetail}</p>
                      )}
                      {contract.closedAt && (
                        <p className="text-xs text-muted-foreground">
                          Chiuso il {formatDateShort(contract.closedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
