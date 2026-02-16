import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ContractType } from "@/types/contract";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContractItem {
  id: number;
  type: string;
  status: string;
  supplier: string | null;
  startDate: Date | null;
  endDate: Date | null;
}

interface ContractSummaryProps {
  contracts: ContractItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTRACT_TYPE_LABELS_IT: Record<string, string> = {
  PROPRIETARIO: "Proprietario",
  BREVE_TERMINE: "Noleggio Breve Termine",
  LUNGO_TERMINE: "Noleggio Lungo Termine",
  LEASING_FINANZIARIO: "Leasing Finanziario",
};

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatContractDate(date: Date | null): string {
  if (!date) return "-";
  return dateFormatter.format(new Date(date));
}

function getContractStatusBadge(status: string) {
  if (status === "ACTIVE") {
    return {
      label: "Attivo",
      variant: "outline" as const,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
    };
  }
  return {
    label: "Chiuso",
    variant: "secondary" as const,
    className: "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractSummary({ contracts }: ContractSummaryProps) {
  // Active contracts only
  const activeContracts = contracts.filter((c) => c.status === "ACTIVE");

  // Show the most recent active contract (first in the array, already sorted desc by startDate)
  const primaryContract = activeContracts[0] ?? null;
  const hasMoreContracts = activeContracts.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          Contratto
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!primaryContract ? (
          <p className="text-sm text-muted-foreground">
            Nessun contratto attivo
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                {CONTRACT_TYPE_LABELS_IT[primaryContract.type as ContractType] ??
                  primaryContract.type}
              </span>
              {(() => {
                const config = getContractStatusBadge(primaryContract.status);
                return (
                  <Badge variant={config.variant} className={config.className}>
                    {config.label}
                  </Badge>
                );
              })()}
            </div>

            {primaryContract.supplier && (
              <div className="text-sm">
                <span className="text-muted-foreground">Fornitore: </span>
                <span className="font-medium">{primaryContract.supplier}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Inizio: </span>
                <span className="font-medium">
                  {formatContractDate(primaryContract.startDate)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Fine: </span>
                <span className="font-medium">
                  {formatContractDate(primaryContract.endDate)}
                </span>
              </div>
            </div>

            {hasMoreContracts && (
              <p className="text-xs text-muted-foreground italic">
                Storico contrattuale disponibile
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
