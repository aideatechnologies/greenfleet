"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Check,
  X,
  SkipForward,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

import {
  getImportAction,
  confirmLineAction,
  confirmAllAutoMatchedAction,
  finalizeImportAction,
} from "../actions/import-actions";

import type {
  InvoiceImportWithLines,
  ImportLineWithMatch,
} from "@/lib/services/invoice-import-service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const numberFormatter = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMatchStatusBadge(status: string) {
  switch (status) {
    case "AUTO_MATCHED":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Auto-match</Badge>;
    case "SUGGESTED":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Suggerito</Badge>;
    case "CANDIDATE":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Candidato</Badge>;
    case "UNMATCHED":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Non matchato</Badge>;
    case "ERROR":
      return <Badge variant="destructive">Errore</Badge>;
    case "CONFIRMED":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confermato</Badge>;
    case "REJECTED":
      return <Badge variant="secondary">Rifiutato</Badge>;
    case "SKIPPED":
      return <Badge variant="secondary">Saltato</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score > 85) return "text-green-700";
  if (score > 50) return "text-yellow-700";
  return "text-red-700";
}

function formatDate(date: Date | string | null): string {
  if (!date) return "\u2014";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "\u2014";
  return format(d, "dd/MM/yyyy", { locale: it });
}

function computeSummary(lines: ImportLineWithMatch[]) {
  let autoMatched = 0;
  let suggested = 0;
  let unmatched = 0;
  let errors = 0;
  let confirmed = 0;
  let rejected = 0;
  let skipped = 0;

  for (const line of lines) {
    switch (line.matchStatus) {
      case "AUTO_MATCHED":
        autoMatched++;
        break;
      case "SUGGESTED":
      case "CANDIDATE":
        suggested++;
        break;
      case "UNMATCHED":
        unmatched++;
        break;
      case "ERROR":
        errors++;
        break;
      case "CONFIRMED":
        confirmed++;
        break;
      case "REJECTED":
        rejected++;
        break;
      case "SKIPPED":
        skipped++;
        break;
    }
  }

  return { autoMatched, suggested, unmatched, errors, confirmed, rejected, skipped };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ImportReviewClientProps = {
  importData: InvoiceImportWithLines;
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ImportReviewClient({ importData: initialData }: ImportReviewClientProps) {
  const [importData, setImportData] = useState<InvoiceImportWithLines>(initialData);
  const [isFinalized, setIsFinalized] = useState(initialData.status === "COMPLETED");
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(() => computeSummary(importData.lines), [importData.lines]);
  const hasAutoMatched = summary.autoMatched > 0;

  // ---- Confirm/Reject/Skip single line ----
  const handleLineAction = useCallback(
    (lineId: string, action: "confirm" | "reject" | "skip") => {
      startTransition(async () => {
        const result = await confirmLineAction(lineId, action);
        if (result.success) {
          setImportData((prev) => ({
            ...prev,
            lines: prev.lines.map((line) =>
              line.id === lineId
                ? {
                    ...line,
                    matchStatus:
                      action === "confirm"
                        ? "CONFIRMED"
                        : action === "reject"
                          ? "REJECTED"
                          : "SKIPPED",
                  }
                : line
            ),
          }));
          const labels = { confirm: "confermata", reject: "rifiutata", skip: "saltata" };
          toast.success(`Riga ${labels[action]}`);
        } else {
          toast.error(result.error);
        }
      });
    },
    [startTransition]
  );

  // ---- Confirm all auto-matched ----
  const handleConfirmAllAutoMatched = useCallback(() => {
    startTransition(async () => {
      const result = await confirmAllAutoMatchedAction(importData.id);
      if (result.success) {
        toast.success(`${result.data} righe confermate automaticamente`);
        setImportData((prev) => ({
          ...prev,
          lines: prev.lines.map((line) =>
            line.matchStatus === "AUTO_MATCHED"
              ? { ...line, matchStatus: "CONFIRMED" }
              : line
          ),
        }));
      } else {
        toast.error(result.error);
      }
    });
  }, [importData.id, startTransition]);

  // ---- Finalize import ----
  const handleFinalize = useCallback(() => {
    startTransition(async () => {
      const result = await finalizeImportAction(importData.id);
      if (result.success) {
        setImportData(result.data);
        setIsFinalized(true);
        toast.success("Importazione finalizzata");
      } else {
        toast.error(result.error);
      }
    });
  }, [importData.id, startTransition]);

  // ---- Reload import data from server ----
  const refreshImportData = useCallback(() => {
    startTransition(async () => {
      const result = await getImportAction(importData.id);
      if (result.success) {
        setImportData(result.data);
        if (result.data.status === "COMPLETED") {
          setIsFinalized(true);
        }
      } else {
        toast.error(result.error);
      }
    });
  }, [importData.id, startTransition]);

  // ---- Finalized view ----
  if (isFinalized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Importazione completata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Righe estratte"
              value={importData.totalLinesExtracted}
              variant="default"
            />
            <SummaryCard
              label="Matchate/Confermate"
              value={importData.totalLinesMatched}
              variant="success"
            />
            <SummaryCard
              label="Create"
              value={importData.totalLinesCreated}
              variant="info"
            />
            <SummaryCard
              label="Saltate/Rifiutate"
              value={importData.totalLinesSkipped}
              variant="warning"
            />
            {importData.totalLinesError > 0 && (
              <SummaryCard
                label="Errori"
                value={importData.totalLinesError}
                variant="error"
              />
            )}
          </div>

          {importData.processingLog && (
            <div className="space-y-1">
              <Label>Log di elaborazione</Label>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                {importData.processingLog}
              </pre>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t">
            <Button asChild variant="outline">
              <Link href="/fuel-records">Torna ai rifornimenti</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Review view ----
  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {summary.autoMatched} Auto-match
        </Badge>
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {summary.suggested} Suggeriti
        </Badge>
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="h-3 w-3 mr-1" />
          {summary.unmatched} Non matchati
        </Badge>
        {summary.errors > 0 && (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {summary.errors} Errori
          </Badge>
        )}
        {summary.confirmed > 0 && (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <Check className="h-3 w-3 mr-1" />
            {summary.confirmed} Confermati
          </Badge>
        )}
        {summary.rejected > 0 && (
          <Badge variant="secondary">
            {summary.rejected} Rifiutati
          </Badge>
        )}
        {summary.skipped > 0 && (
          <Badge variant="secondary">
            {summary.skipped} Saltati
          </Badge>
        )}
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-3">
        {hasAutoMatched && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleConfirmAllAutoMatched}
            disabled={isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            Conferma tutti auto-match ({summary.autoMatched})
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshImportData}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : null}
          Aggiorna dati
        </Button>
      </div>

      {/* Lines table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Targa</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo carburante</TableHead>
                  <TableHead className="text-right">Quantita</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead>Stato match</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.lines.map((line) => (
                  <ImportLineRow
                    key={line.id}
                    line={line}
                    onAction={handleLineAction}
                    isPending={isPending}
                  />
                ))}
                {importData.lines.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nessuna riga estratta
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Finalize button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button asChild variant="outline">
          <Link href="/fuel-records">Annulla</Link>
        </Button>
        <Button
          onClick={handleFinalize}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Finalizzazione...
            </>
          ) : (
            "Finalizza import"
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ImportLineRow({
  line,
  onAction,
  isPending,
}: {
  line: ImportLineWithMatch;
  onAction: (lineId: string, action: "confirm" | "reject" | "skip") => void;
  isPending: boolean;
}) {
  const isActionable =
    line.matchStatus === "AUTO_MATCHED" ||
    line.matchStatus === "SUGGESTED" ||
    line.matchStatus === "CANDIDATE" ||
    line.matchStatus === "UNMATCHED";

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{line.lineNumber}</TableCell>
      <TableCell className="font-mono text-xs">
        {line.licensePlate ?? "\u2014"}
      </TableCell>
      <TableCell className="text-xs">{formatDate(line.date)}</TableCell>
      <TableCell className="text-xs">{line.fuelType ?? "\u2014"}</TableCell>
      <TableCell className="text-right text-xs">
        {line.quantity != null ? numberFormatter.format(line.quantity) : "\u2014"}
      </TableCell>
      <TableCell className="text-right text-xs">
        {line.amount != null ? currencyFormatter.format(line.amount) : "\u2014"}
      </TableCell>
      <TableCell>{getMatchStatusBadge(line.matchStatus)}</TableCell>
      <TableCell className={cn("text-right text-xs font-medium", getScoreColor(line.matchScore))}>
        {line.matchScore != null ? `${Math.round(line.matchScore)}%` : "\u2014"}
      </TableCell>
      <TableCell className="text-right">
        {isActionable && (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => onAction(line.id, "confirm")}
              disabled={isPending}
              title="Conferma"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onAction(line.id, "reject")}
              disabled={isPending}
              title="Rifiuta"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onAction(line.id, "skip")}
              disabled={isPending}
              title="Salta"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "default" | "success" | "info" | "warning" | "error";
}) {
  const colorMap = {
    default: "text-foreground",
    success: "text-green-700",
    info: "text-blue-700",
    warning: "text-yellow-700",
    error: "text-red-700",
  };

  return (
    <div className="rounded-lg border p-4 space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold", colorMap[variant])}>{value}</p>
    </div>
  );
}
