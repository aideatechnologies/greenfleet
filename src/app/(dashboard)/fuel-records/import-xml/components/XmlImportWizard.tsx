"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Upload,
  Check,
  X,
  SkipForward,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  getActiveTemplatesAction,
  startImportAction,
  getImportAction,
  confirmLineAction,
  confirmAllAutoMatchedAction,
  finalizeImportAction,
  detectFatturaAction,
} from "../actions/import-actions";
import type { FatturaDetection } from "@/lib/services/xml-parser-service";

import type { XmlTemplateWithSupplier } from "@/lib/services/xml-template-service";
import type {
  InvoiceImportWithLines,
  ImportLineWithMatch,
} from "@/lib/services/invoice-import-service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_LABELS = [
  "Upload & Configura",
  "Elaborazione",
  "Revisione & Riconcilia",
  "Completato",
];

const numberFormatter = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

const TABLE_COLUMN_COUNT = 11;

// ---------------------------------------------------------------------------
// Match score breakdown type
// ---------------------------------------------------------------------------

type MatchScoreBreakdown = {
  licensePlate?: { score: number; weight: number; detail: string };
  date?: { score: number; weight: number; detail: string };
  quantity?: { score: number; weight: number; detail: string };
  amount?: { score: number; weight: number; detail: string };
  fuelType?: { score: number; weight: number; detail: string };
  totalScore: number;
};

function parseMatchDetails(raw: string | null): MatchScoreBreakdown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MatchScoreBreakdown;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreBarColor(pct: number): string {
  if (pct >= 85) return "bg-green-500";
  if (pct >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreBarBg(pct: number): string {
  if (pct >= 85) return "bg-green-100";
  if (pct >= 50) return "bg-yellow-100";
  return "bg-red-100";
}

function ColumnHeader({ label, tooltip, className }: { label: string; tooltip: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-xs text-muted-foreground">{"\u2014"}</span>;
  }
  const pct = Math.round(score);
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className={cn("h-2 w-full rounded-full overflow-hidden", getScoreBarBg(pct))}>
        <div
          className={cn("h-full rounded-full transition-all", getScoreBarColor(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("text-xs font-medium tabular-nums whitespace-nowrap", getScoreColor(pct))}>
        {pct}%
      </span>
    </div>
  );
}

const BREAKDOWN_LABELS: Record<string, string> = {
  licensePlate: "Targa",
  date: "Data",
  quantity: "Quantit\u00e0",
  amount: "Importo",
  fuelType: "Tipo carburante",
};

function MatchDetailPanel({ details }: { details: MatchScoreBreakdown }) {
  const fields = ["licensePlate", "date", "quantity", "amount", "fuelType"] as const;

  return (
    <div className="p-4 bg-muted/40 border-t space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Dettaglio punteggio di match
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map((field) => {
          const item = details[field];
          if (!item) return null;
          const fieldScore = Math.round(item.score * 100);
          const fieldWeight = Math.round(item.weight * 100);
          return (
            <div key={field} className="rounded-md border bg-background p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{BREAKDOWN_LABELS[field]}</span>
                <span className="text-xs text-muted-foreground">
                  Peso: {fieldWeight}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("h-1.5 flex-1 rounded-full overflow-hidden", getScoreBarBg(fieldScore))}>
                  <div
                    className={cn("h-full rounded-full transition-all", getScoreBarColor(fieldScore))}
                    style={{ width: `${fieldScore}%` }}
                  />
                </div>
                <span className={cn("text-xs font-medium tabular-nums", getScoreColor(fieldScore))}>
                  {fieldScore}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {item.detail}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 pt-1 border-t">
        <span className="text-xs font-medium">Punteggio totale:</span>
        <ScoreBar score={Math.round(details.totalScore * 100)} />
      </div>
    </div>
  );
}

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
// Main Component
// ---------------------------------------------------------------------------

export function XmlImportWizard() {
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<XmlTemplateWithSupplier[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [fileName, setFileName] = useState("");
  const [xmlContent, setXmlContent] = useState("");
  const [requireManualConfirm, setRequireManualConfirm] = useState(false);
  const [importData, setImportData] = useState<InvoiceImportWithLines | null>(null);
  const [detection, setDetection] = useState<FatturaDetection | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load templates on mount
  useEffect(() => {
    startTransition(async () => {
      const result = await getActiveTemplatesAction();
      if (result.success) {
        setTemplates(result.data);
      } else {
        toast.error(result.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- File upload handler ----
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith(".xml")) {
        toast.error("Seleziona un file XML valido");
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        if (!content) {
          toast.error("Impossibile leggere il file");
          return;
        }
        setFileName(file.name);
        setXmlContent(content);
        toast.success(`File "${file.name}" caricato (${(content.length / 1024).toFixed(1)} KB)`);

        // Auto-detect FatturaPA structure
        startTransition(async () => {
          const result = await detectFatturaAction(content);
          if (result.success) {
            setDetection(result.data.detection);
            if (result.data.suggestedTemplateId) {
              setSelectedTemplateId(result.data.suggestedTemplateId);
              toast.success(
                `Fornitore rilevato: ${result.data.detection.supplierName ?? result.data.detection.supplierVat} — template "${result.data.suggestedTemplateName}" selezionato automaticamente`
              );
            } else if (result.data.detection.supplierName) {
              toast.info(
                `Fornitore rilevato: ${result.data.detection.supplierName} (P.IVA: ${result.data.detection.supplierVat ?? "N/D"}) — nessun template configurato per questo fornitore`
              );
            }
          }
        });
      };
      reader.onerror = () => {
        toast.error("Errore nella lettura del file");
      };
      reader.readAsText(file);
    },
    []
  );

  // ---- Start import ----
  const handleStartImport = useCallback(() => {
    if (!selectedTemplateId) {
      toast.error("Seleziona un template");
      return;
    }
    if (!xmlContent) {
      toast.error("Carica un file XML");
      return;
    }

    setStep(1);

    startTransition(async () => {
      const result = await startImportAction({
        templateId: selectedTemplateId,
        fileName,
        xmlContent,
        requireManualConfirm,
      });

      if (result.success) {
        setImportData(result.data);

        if (result.data.status === "ERROR") {
          toast.error("Errore nell'elaborazione del file XML");
          setStep(0);
        } else {
          toast.success(
            `Elaborazione completata: ${result.data.totalLinesExtracted} righe estratte`
          );
          setStep(2);
        }
      } else {
        toast.error(result.error);
        setStep(0);
      }
    });
  }, [selectedTemplateId, xmlContent, fileName, requireManualConfirm, startTransition]);

  // ---- Confirm/Reject/Skip single line ----
  const handleLineAction = useCallback(
    (lineId: string, action: "confirm" | "reject" | "skip") => {
      startTransition(async () => {
        const result = await confirmLineAction(lineId, action);
        if (result.success) {
          // Update local state
          setImportData((prev) => {
            if (!prev) return prev;
            return {
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
            };
          });
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
    if (!importData) return;

    startTransition(async () => {
      const result = await confirmAllAutoMatchedAction(importData.id);
      if (result.success) {
        toast.success(`${result.data} righe confermate automaticamente`);
        // Update local state
        setImportData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            lines: prev.lines.map((line) =>
              line.matchStatus === "AUTO_MATCHED"
                ? { ...line, matchStatus: "CONFIRMED" }
                : line
            ),
          };
        });
      } else {
        toast.error(result.error);
      }
    });
  }, [importData, startTransition]);

  // ---- Finalize import ----
  const handleFinalize = useCallback(() => {
    if (!importData) return;

    startTransition(async () => {
      const result = await finalizeImportAction(importData.id);
      if (result.success) {
        setImportData(result.data);
        setStep(3);
        toast.success("Importazione finalizzata");
      } else {
        toast.error(result.error);
      }
    });
  }, [importData, startTransition]);

  // ---- Reload import data from server ----
  const refreshImportData = useCallback(() => {
    if (!importData) return;

    startTransition(async () => {
      const result = await getImportAction(importData.id);
      if (result.success) {
        setImportData(result.data);
      } else {
        toast.error(result.error);
      }
    });
  }, [importData, startTransition]);

  // ---- Derived data ----
  const summary = useMemo(() => {
    if (!importData) return null;
    return computeSummary(importData.lines);
  }, [importData]);

  const canStartImport = xmlContent.length > 0 && selectedTemplateId.length > 0;

  // ========================================================================
  // STEP 0: Upload & Configure
  // ========================================================================

  function renderStep0() {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Carica file XML</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File upload dropzone */}
            <div className="space-y-2">
              <Label>File XML FatturaPA</Label>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Carica file XML FatturaPA
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Trascina o clicca per selezionare
                </span>
                <input
                  type="file"
                  accept=".xml"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              {xmlContent && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>
                    {fileName} ({(xmlContent.length / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>

            {/* Auto-detected info */}
            {detection && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">Fattura rilevata automaticamente</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  {detection.supplierName && (
                    <>
                      <span className="text-muted-foreground">Fornitore:</span>
                      <span className="font-medium">{detection.supplierName}</span>
                    </>
                  )}
                  {detection.supplierVat && (
                    <>
                      <span className="text-muted-foreground">P.IVA:</span>
                      <span className="font-mono">{detection.supplierVat}</span>
                    </>
                  )}
                  {detection.invoiceNumber && (
                    <>
                      <span className="text-muted-foreground">Numero fattura:</span>
                      <span>{detection.invoiceNumber}</span>
                    </>
                  )}
                  {detection.invoiceDate && (
                    <>
                      <span className="text-muted-foreground">Data fattura:</span>
                      <span>{detection.invoiceDate}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">Righe rilevate:</span>
                  <span>{detection.sampleLineCount}</span>
                  <span className="text-muted-foreground">Targa in AltriDati:</span>
                  <span>{detection.hasAltriDatiGestionaliTarga ? "S\u00ec" : "No"}</span>
                  <span className="text-muted-foreground">Data rifornimento:</span>
                  <span>{detection.hasDataInizioPeriodo ? "DataInizioPeriodo" : "In descrizione"}</span>
                </div>
              </div>
            )}

            {/* Template selector */}
            <div className="space-y-2">
              <Label>Template di estrazione</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.supplier.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && !isPending && (
                <p className="text-xs text-muted-foreground">
                  Nessun template attivo trovato. Configura prima un template
                  nelle impostazioni del fornitore.
                </p>
              )}
            </div>

            {/* Require manual confirm toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="require-manual-confirm"
                checked={requireManualConfirm}
                onCheckedChange={setRequireManualConfirm}
              />
              <Label htmlFor="require-manual-confirm" className="cursor-pointer">
                Richiedi conferma manuale per tutti i match
              </Label>
            </div>

            {/* Start import button */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                onClick={handleStartImport}
                disabled={!canStartImport || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Avvio in corso...
                  </>
                ) : (
                  "Avvia import"
                )}
              </Button>
              {!canStartImport && (
                <span className="text-xs text-muted-foreground">
                  Carica un file XML e seleziona un template per procedere
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========================================================================
  // STEP 1: Processing
  // ========================================================================

  function renderStep1() {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h3 className="text-lg font-semibold">Elaborazione in corso...</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Estrazione delle righe dal file XML e riconciliazione con i
            rifornimenti esistenti. Questa operazione potrebbe richiedere
            qualche secondo.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ========================================================================
  // STEP 2: Review & Reconcile
  // ========================================================================

  function renderStep2() {
    if (!importData || !summary) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nessun dato disponibile.
          </CardContent>
        </Card>
      );
    }

    const hasAutoMatched = summary.autoMatched > 0;

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
              <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>
                      <ColumnHeader label="Targa" tooltip="Targa del veicolo estratta dalla riga della fattura" />
                    </TableHead>
                    <TableHead>
                      <ColumnHeader label="Data" tooltip="Data del rifornimento riportata in fattura" />
                    </TableHead>
                    <TableHead>
                      <ColumnHeader label="Tipo carburante" tooltip="Tipo di carburante (es. Diesel, Benzina, GPL)" />
                    </TableHead>
                    <TableHead className="text-right">
                      <ColumnHeader label="Quantit&#224; (L)" tooltip="Litri di carburante erogati" className="justify-end" />
                    </TableHead>
                    <TableHead className="text-right">
                      <ColumnHeader label="Importo (EUR)" tooltip="Importo totale della riga in Euro" className="justify-end" />
                    </TableHead>
                    <TableHead>
                      <ColumnHeader label="N. Carta" tooltip="Numero della carta carburante utilizzata" />
                    </TableHead>
                    <TableHead>
                      <ColumnHeader label="Descrizione" tooltip="Descrizione della riga estratta dalla fattura XML" />
                    </TableHead>
                    <TableHead>
                      <ColumnHeader label="Stato match" tooltip="Stato della riconciliazione con i rifornimenti in archivio" />
                    </TableHead>
                    <TableHead className="min-w-[120px]">
                      <ColumnHeader label="Score" tooltip="Punteggio di corrispondenza (0-100%)" className="justify-end" />
                    </TableHead>
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
                        colSpan={TABLE_COLUMN_COUNT}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Nessuna riga estratta
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>

        {/* Finalize button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
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

  // ========================================================================
  // STEP 3: Complete
  // ========================================================================

  function renderStep3() {
    if (!importData) return null;

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

  // ========================================================================
  // Main render
  // ========================================================================

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEP_LABELS.map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className={cn(
                  "h-[2px] w-8",
                  index <= step ? "bg-primary" : "bg-muted"
                )}
              />
            )}
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                index === step
                  ? "bg-primary text-primary-foreground"
                  : index < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px]">
                {index + 1}
              </span>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
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
  const [expanded, setExpanded] = useState(false);

  const isActionable =
    line.matchStatus === "AUTO_MATCHED" ||
    line.matchStatus === "SUGGESTED" ||
    line.matchStatus === "CANDIDATE" ||
    line.matchStatus === "UNMATCHED";

  const matchDetails = useMemo(
    () => parseMatchDetails(line.matchDetails),
    [line.matchDetails]
  );

  const hasDetails = matchDetails !== null;
  const scorePercent = line.matchScore != null ? Math.round(line.matchScore * 100) : null;

  return (
    <>
      <TableRow
        className={cn(
          hasDetails && "cursor-pointer hover:bg-muted/50",
          expanded && "bg-muted/30"
        )}
        onClick={() => {
          if (hasDetails) setExpanded((prev) => !prev);
        }}
      >
        <TableCell className="text-muted-foreground">
          <div className="flex items-center gap-1">
            {hasDetails && (
              expanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )
            )}
            <span>{line.lineNumber}</span>
          </div>
        </TableCell>
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
        <TableCell className="text-xs">
          <span className="block max-w-[120px] truncate" title={line.cardNumber ?? undefined}>
            {line.cardNumber ?? "\u2014"}
          </span>
        </TableCell>
        <TableCell className="text-xs">
          <span className="block max-w-[120px] truncate" title={line.description ?? undefined}>
            {line.description ?? "\u2014"}
          </span>
        </TableCell>
        <TableCell>{getMatchStatusBadge(line.matchStatus)}</TableCell>
        <TableCell>
          <ScoreBar score={scorePercent} />
        </TableCell>
        <TableCell className="text-right">
          {isActionable && (
            <div
              className="flex items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
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
      {expanded && hasDetails && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={TABLE_COLUMN_COUNT} className="p-0">
            <MatchDetailPanel details={matchDetails} />
          </TableCell>
        </TableRow>
      )}
    </>
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
