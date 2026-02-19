"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import {
  parseCSV,
  parseExcel,
  detectFileType,
  autoMapColumns,
  validateImportRows,
} from "@/lib/services/fuel-card-import-service";
import {
  importFuelCardsAction,
  getFuelCardImportLookupsAction,
} from "../actions/import-fuel-cards";
import type { FuelCardImportConfig } from "@/lib/schemas/fuel-card-import";
import {
  FUEL_CARD_FIELD_LABELS,
  FUEL_CARD_IMPORTABLE_FIELDS,
  FUEL_CARD_REQUIRED_FIELDS,
} from "@/lib/schemas/fuel-card-import";
import type { FuelCardImportValidation } from "@/lib/schemas/fuel-card-import";
import type { FuelCardImportResult } from "@/lib/schemas/fuel-card-import";
import type { ParsedData, ColumnMapping } from "@/types/import";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const UNMAPPED_VALUE = "__unmapped__";

const STEPS = [
  { key: "upload", label: "Upload" },
  { key: "mapping", label: "Mappatura" },
  { key: "preview", label: "Anteprima" },
  { key: "confirm", label: "Conferma" },
  { key: "result", label: "Risultato" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function FuelCardImportWizard() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<StepKey>("upload");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const [config, setConfig] = useState<FuelCardImportConfig>({
    separator: ";",
    hasHeader: true,
    encoding: "UTF-8",
    numberFormat: "IT",
  });
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validationResults, setValidationResults] = useState<
    FuelCardImportValidation[]
  >([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [importResult, setImportResult] =
    useState<FuelCardImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) setCurrentStep(STEPS[nextIndex].key);
  }, [currentStepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) setCurrentStep(STEPS[prevIndex].key);
  }, [currentStepIndex]);

  const validateFile = useCallback((file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) return `Formato non supportato. Formati accettati: ${ACCEPTED_EXTENSIONS.join(", ")}`;
    if (file.size > MAX_FILE_SIZE) return "Il file supera la dimensione massima di 10MB";
    return null;
  }, []);

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) { setFileError(validationError); setSelectedFile(null); return; }
    setFileError(null);
    setSelectedFile(file);
  }, [validateFile]);

  const handleFileSelected = useCallback(async (file: File, fileConfig: FuelCardImportConfig) => {
    try {
      const fileType = detectFileType(file.name);
      let parsed: ParsedData;
      if (fileType === "csv") {
        const decoder = new TextDecoder(fileConfig.encoding);
        const buffer = await file.arrayBuffer();
        const text = decoder.decode(buffer);
        parsed = parseCSV(text, { separator: fileConfig.separator, hasHeader: fileConfig.hasHeader });
      } else {
        const buffer = await file.arrayBuffer();
        parsed = parseExcel(buffer);
      }
      if (parsed.rows.length === 0) { toast.error("Il file non contiene dati da importare"); return; }
      setParsedData(parsed);
      setMapping(autoMapColumns(parsed.headers));
      goNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nel parsing del file");
    }
  }, [goNext]);

  const handleMappingNext = useCallback(async () => {
    const missingRequired = FUEL_CARD_REQUIRED_FIELDS.filter((f) => !(f in mapping));
    if (missingRequired.length > 0) {
      toast.error(`Mappa almeno i campi obbligatori: ${missingRequired.map((f) => FUEL_CARD_FIELD_LABELS[f]).join(", ")}`);
      return;
    }
    if (!parsedData) return;

    setIsValidating(true);
    try {
      const lookupsResult = await getFuelCardImportLookupsAction();
      if (!lookupsResult.success) { toast.error(lookupsResult.error); setIsValidating(false); return; }

      const existingCardNumbers = new Set(lookupsResult.data.existingCardNumbers);

      const vehiclePlateMap = new Map<string, number>();
      for (const v of lookupsResult.data.vehicles) {
        vehiclePlateMap.set(v.licensePlate.toUpperCase().replace(/[\s\-]/g, ""), v.id);
      }

      const employeeNameMap = new Map<string, number>();
      for (const e of lookupsResult.data.employees) {
        employeeNameMap.set(e.name.toLowerCase(), e.id);
      }

      const supplierNameMap = new Map<string, number>();
      for (const s of lookupsResult.data.suppliers) {
        supplierNameMap.set(s.name.toLowerCase(), s.id);
      }

      const results = validateImportRows(
        parsedData.rows,
        mapping,
        parsedData.headers,
        existingCardNumbers,
        vehiclePlateMap,
        employeeNameMap,
        supplierNameMap
      );

      setValidationResults(results);
      goNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore durante la validazione");
    } finally {
      setIsValidating(false);
    }
  }, [parsedData, mapping, goNext]);

  const handleConfirmImport = useCallback(async () => {
    const validResults = validationResults.filter((r) => r.isValid && r.resolved);
    if (validResults.length === 0) { toast.error("Nessuna riga valida da importare"); return; }

    setIsImporting(true);
    try {
      const rows = validResults.map((r) => ({
        cardNumber: r.resolved!.cardNumber,
        issuer: r.resolved!.issuer,
        supplierId: r.resolved!.supplierId,
        expiryDate: r.resolved!.expiryDate ? r.resolved!.expiryDate.toISOString() : null,
        assignedVehicleId: r.resolved!.assignedVehicleId,
        assignedEmployeeId: r.resolved!.assignedEmployeeId,
        assignmentType: r.resolved!.assignmentType,
      }));

      const result = await importFuelCardsAction(rows);
      if (result.success) {
        const errorRowCount = validationResults.filter((r) => !r.isValid).length;
        setImportResult({
          ...result.data,
          totalRows: validationResults.length,
          errorRows: errorRowCount,
          skippedRows: result.data.skippedRows + errorRowCount,
        });
        setCurrentStep("result");
        if (result.data.importedRows > 0) {
          toast.success(`${result.data.importedRows} ${result.data.importedRows === 1 ? "carta importata" : "carte importate"} con successo`);
        } else {
          toast.warning("Nessuna carta importata");
        }
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore durante l'importazione");
    } finally {
      setIsImporting(false);
    }
  }, [validationResults]);

  const handleReset = useCallback(() => {
    setCurrentStep("upload");
    setConfig({ separator: ";", hasHeader: true, encoding: "UTF-8", numberFormat: "IT" });
    setParsedData(null); setMapping({}); setValidationResults([]);
    setImportResult(null); setIsImporting(false); setIsValidating(false);
    setSelectedFile(null); setFileError(null); setShowOnlyErrors(false); setConfirmed(false);
  }, []);

  const handleCancel = useCallback(() => setCancelDialogOpen(true), []);
  const handleConfirmCancel = useCallback(() => { setCancelDialogOpen(false); router.push("/fuel-cards"); }, [router]);

  const validRowCount = validationResults.filter((r) => r.isValid).length;
  const errorRowCount = validationResults.length - validRowCount;
  const warningCount = validationResults.filter((r) => r.warnings.length > 0).length;
  const filteredResults = useMemo(() => showOnlyErrors ? validationResults.filter((r) => !r.isValid) : validationResults, [validationResults, showOnlyErrors]);
  const isCSV = selectedFile?.name.toLowerCase().endsWith(".csv") ?? false;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const formatDuration = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

  const getFieldForColumn = useCallback((colIndex: number): string => {
    for (const [field, idx] of Object.entries(mapping)) { if (idx === colIndex) return field; }
    return UNMAPPED_VALUE;
  }, [mapping]);

  const handleFieldChange = useCallback((colIndex: number, fieldName: string) => {
    const newMapping = { ...mapping };
    for (const [field, idx] of Object.entries(newMapping)) { if (idx === colIndex) delete newMapping[field]; }
    if (fieldName !== UNMAPPED_VALUE) { delete newMapping[fieldName]; newMapping[fieldName] = colIndex; }
    setMapping(newMapping);
  }, [mapping]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const isCurrent = step.key === currentStep;
          const isCompleted = index < currentStepIndex;
          const isResultStep = step.key === "result";
          return (
            <div key={step.key} className="flex items-center gap-2">
              {index > 0 && <div className={`h-[2px] w-8 ${isCompleted ? "bg-primary" : "bg-muted"}`} />}
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${isCurrent ? "bg-primary text-primary-foreground" : isCompleted ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"} ${isResultStep && !importResult ? "opacity-50" : ""}`}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px]">{index + 1}</span>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="min-h-[300px]">
        {currentStep === "upload" && (
          <div className="space-y-6">
            <div className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors cursor-pointer ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onClick={() => inputRef.current?.click()}>
              <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="mb-1 text-sm font-medium">Trascina qui il tuo file oppure clicca per selezionarlo</p>
              <p className="text-xs text-muted-foreground">Formati supportati: CSV, XLSX, XLS (max 10MB)</p>
              <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }} className="hidden" />
            </div>
            {fileError && <p className="text-sm text-destructive">{fileError}</p>}
            {selectedFile && (
              <Card><CardContent className="flex items-center gap-3 py-3">
                <FileText className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{selectedFile.name}</p><p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p></div>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFileError(null); if (inputRef.current) inputRef.current.value = ""; }}><X className="h-4 w-4" /></Button>
              </CardContent></Card>
            )}
            {selectedFile && isCSV && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Configurazione CSV</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2"><Label>Separatore</Label><Select value={config.separator} onValueChange={(v) => setConfig({ ...config, separator: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value=";">Punto e virgola (;)</SelectItem><SelectItem value=",">Virgola (,)</SelectItem><SelectItem value={"\t"}>Tabulazione</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Codifica</Label><Select value={config.encoding} onValueChange={(v) => setConfig({ ...config, encoding: v as FuelCardImportConfig["encoding"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UTF-8">UTF-8</SelectItem><SelectItem value="ISO-8859-1">Latin-1</SelectItem><SelectItem value="Windows-1252">Windows-1252</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Formato numeri</Label><Select value={config.numberFormat} onValueChange={(v) => setConfig({ ...config, numberFormat: v as "IT" | "EN" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="IT">Italiano (1.234,56)</SelectItem><SelectItem value="EN">Inglese (1,234.56)</SelectItem></SelectContent></Select></div>
                  <div className="flex items-center gap-3 pt-6"><Switch id="hasHeader" checked={config.hasHeader} onCheckedChange={(checked) => setConfig({ ...config, hasHeader: checked })} /><Label htmlFor="hasHeader">Prima riga = intestazioni</Label></div>
                </div>
              </div>
            )}
            {selectedFile && <div className="flex justify-end"><Button onClick={() => handleFileSelected(selectedFile, config)}>Avanti</Button></div>}
          </div>
        )}

        {currentStep === "mapping" && parsedData && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Associa le colonne del file ai campi. <span className="font-medium text-foreground">Numero Carta e Emittente</span> sono obbligatori.</p>
            <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead className="w-[200px]">Colonna file</TableHead><TableHead className="w-[200px]">Valore anteprima</TableHead><TableHead className="w-[250px]">Campo Greenfleet</TableHead></TableRow></TableHeader><TableBody>
              {parsedData.headers.map((header, colIndex) => {
                const currentField = getFieldForColumn(colIndex);
                const isRequired = currentField !== UNMAPPED_VALUE && FUEL_CARD_REQUIRED_FIELDS.includes(currentField);
                return (
                  <TableRow key={colIndex}><TableCell className="font-medium">{header}{isRequired && <Badge variant="secondary" className="ml-2 text-xs">Obbligatorio</Badge>}</TableCell><TableCell className="text-muted-foreground">{parsedData.rows[0]?.[colIndex] ?? <span className="italic">vuoto</span>}</TableCell><TableCell>
                    <Select value={currentField} onValueChange={(v) => handleFieldChange(colIndex, v)}><SelectTrigger className="w-[220px]"><SelectValue placeholder="Non mappato" /></SelectTrigger><SelectContent><SelectItem value={UNMAPPED_VALUE}>-- Non mappato --</SelectItem>{FUEL_CARD_IMPORTABLE_FIELDS.map((field) => (<SelectItem key={field} value={field}>{FUEL_CARD_FIELD_LABELS[field]}{FUEL_CARD_REQUIRED_FIELDS.includes(field) ? " *" : ""}</SelectItem>))}</SelectContent></Select>
                  </TableCell></TableRow>
                );
              })}
            </TableBody></Table></div>
            <p className="text-xs text-muted-foreground">Totale righe dati nel file: {parsedData.rows.length}</p>
          </div>
        )}

        {currentStep === "preview" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="rounded-md border px-4 py-3"><p className="text-xs text-muted-foreground">Totale righe</p><p className="text-2xl font-bold">{validationResults.length}</p></div>
              <div className="rounded-md border px-4 py-3 border-green-200 dark:border-green-800"><p className="text-xs text-muted-foreground">Valide</p><p className="text-2xl font-bold text-green-600">{validRowCount}</p></div>
              <div className="rounded-md border px-4 py-3 border-red-200 dark:border-red-800"><p className="text-xs text-muted-foreground">Con errori</p><p className="text-2xl font-bold text-red-600">{errorRowCount}</p></div>
              {warningCount > 0 && <div className="rounded-md border px-4 py-3 border-amber-200 dark:border-amber-800"><p className="text-xs text-muted-foreground">Con avvisi</p><p className="text-2xl font-bold text-amber-600">{warningCount}</p></div>}
            </div>
            {errorRowCount > 0 && <div className="flex items-center gap-3"><Switch id="showOnlyErrors" checked={showOnlyErrors} onCheckedChange={setShowOnlyErrors} /><Label htmlFor="showOnlyErrors">Mostra solo righe con errori</Label></div>}
            <div className="rounded-md border overflow-auto max-h-[500px]"><Table><TableHeader><TableRow><TableHead className="w-[60px] text-center">Riga</TableHead><TableHead className="w-[80px]">Stato</TableHead><TableHead>N. Carta</TableHead><TableHead>Emittente</TableHead><TableHead>Tipo Asseg.</TableHead><TableHead>Dettagli</TableHead></TableRow></TableHeader><TableBody>
              {filteredResults.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">{showOnlyErrors ? "Nessuna riga con errori" : "Nessun risultato"}</TableCell></TableRow>
              ) : filteredResults.map((result) => (
                <TableRow key={result.rowIndex} className={!result.isValid ? "bg-red-50/50 dark:bg-red-950/10" : result.warnings.length > 0 ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                  <TableCell className="text-center text-muted-foreground text-xs">{result.rowIndex + 1}</TableCell>
                  <TableCell><Badge variant={result.isValid ? "default" : "destructive"} className={result.isValid ? (result.warnings.length > 0 ? "bg-amber-600 hover:bg-amber-600/90" : "bg-green-600 hover:bg-green-600/90") : ""}>{result.isValid ? (result.warnings.length > 0 ? "Avviso" : "OK") : "Errore"}</Badge></TableCell>
                  <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{result.data.cardNumber || "-"}</code></TableCell>
                  <TableCell>{result.data.issuer || "-"}</TableCell>
                  <TableCell>{result.data.assignmentType || "-"}</TableCell>
                  <TableCell>
                    {result.errors.length > 0 ? (<ul className="list-disc pl-4 text-xs text-red-600 dark:text-red-400 space-y-0.5">{result.errors.map((err, i) => (<li key={i}><span className="font-medium">{FUEL_CARD_FIELD_LABELS[err.field] ?? err.field}:</span> {err.message}</li>))}</ul>)
                    : result.warnings.length > 0 ? (<ul className="list-disc pl-4 text-xs text-amber-600 dark:text-amber-400 space-y-0.5">{result.warnings.map((w, i) => (<li key={i}>{w}</li>))}</ul>)
                    : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody></Table></div>
          </div>
        )}

        {currentStep === "confirm" && (
          <div className="space-y-6">
            <Card><CardContent className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold">Riepilogo importazione</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-md border px-4 py-3 text-center"><p className="text-xs text-muted-foreground">Totale righe</p><p className="text-3xl font-bold">{validationResults.length}</p></div>
                <div className="rounded-md border border-green-200 dark:border-green-800 px-4 py-3 text-center"><div className="flex items-center justify-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-green-600" /><p className="text-xs text-muted-foreground">Da importare</p></div><p className="text-3xl font-bold text-green-600">{validRowCount}</p></div>
                <div className="rounded-md border border-red-200 dark:border-red-800 px-4 py-3 text-center"><div className="flex items-center justify-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-red-600" /><p className="text-xs text-muted-foreground">Da escludere</p></div><p className="text-3xl font-bold text-red-600">{errorRowCount}</p></div>
              </div>
              {errorRowCount > 0 && <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3"><p className="text-sm text-amber-800 dark:text-amber-200">Le righe con errori verranno ignorate. Solo le <span className="font-bold">{validRowCount}</span> righe valide verranno importate.</p></div>}
            </CardContent></Card>
            <div className="flex items-start gap-3"><Checkbox id="confirm" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} disabled={isImporting} /><Label htmlFor="confirm" className="text-sm leading-relaxed cursor-pointer">Confermo di voler importare <span className="font-bold">{validRowCount}</span> {validRowCount === 1 ? "carta carburante" : "carte carburante"} nel sistema.</Label></div>
            <div className="flex justify-end"><Button onClick={handleConfirmImport} disabled={!confirmed || isImporting || validRowCount === 0} size="lg">{isImporting ? "Importazione in corso..." : "Importa"}</Button></div>
          </div>
        )}

        {currentStep === "result" && importResult && (
          <div className="space-y-6">
            <Card><CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                {importResult.importedRows === 0 ? <AlertTriangle className="h-16 w-16 text-red-500" /> : importResult.errorRows > 0 || importResult.skippedRows > 0 ? <AlertTriangle className="h-16 w-16 text-amber-500" /> : <CheckCircle2 className="h-16 w-16 text-green-500" />}
                <div>
                  <h3 className="text-xl font-semibold">{importResult.importedRows === 0 ? "Importazione fallita" : importResult.errorRows > 0 ? "Importazione completata con avvisi" : "Importazione completata"}</h3>
                  <p className="mt-1 text-muted-foreground">{importResult.importedRows === 0 ? "Nessuna carta importata." : `${importResult.importedRows} ${importResult.importedRows === 1 ? "carta importata" : "carte importate"} con successo.`}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Durata: {formatDuration(importResult.durationMs)}</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-md border px-4 py-3 text-center"><p className="text-xs text-muted-foreground">Totale</p><p className="text-xl font-bold">{importResult.totalRows}</p></div>
                <div className="rounded-md border border-green-200 dark:border-green-800 px-4 py-3 text-center"><p className="text-xs text-muted-foreground">Importati</p><p className="text-xl font-bold text-green-600">{importResult.importedRows}</p></div>
                <div className="rounded-md border border-amber-200 dark:border-amber-800 px-4 py-3 text-center"><p className="text-xs text-muted-foreground">Ignorati</p><p className="text-xl font-bold text-amber-600">{importResult.skippedRows}</p></div>
                <div className="rounded-md border border-red-200 dark:border-red-800 px-4 py-3 text-center"><p className="text-xs text-muted-foreground">Errori</p><p className="text-xl font-bold text-red-600">{importResult.errorRows}</p></div>
              </div>
            </CardContent></Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild><Link href="/fuel-cards"><CreditCard className="mr-2 h-4 w-4" />Vai alla lista carte</Link></Button>
              <Button variant="secondary" onClick={handleReset}>Importa altro file</Button>
            </div>
          </div>
        )}
      </div>

      {currentStep !== "upload" && currentStep !== "result" && currentStep !== "confirm" && (
        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={handleCancel} disabled={isImporting || isValidating}>Annulla</Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={goBack} disabled={isImporting || isValidating}>Indietro</Button>
            {currentStep === "mapping" && <Button onClick={handleMappingNext} disabled={isValidating}>{isValidating ? "Validazione..." : "Avanti"}</Button>}
            {currentStep === "preview" && <Button onClick={goNext} disabled={validRowCount === 0}>Avanti</Button>}
          </div>
        </div>
      )}
      {currentStep === "confirm" && !isImporting && (
        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={handleCancel}>Annulla</Button>
          <Button variant="secondary" onClick={goBack}>Indietro</Button>
        </div>
      )}
      {currentStep === "upload" && (
        <div className="flex items-center border-t pt-4"><Button variant="ghost" onClick={handleCancel}>Annulla</Button></div>
      )}

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Annullare l&apos;importazione?</AlertDialogTitle><AlertDialogDescription>Tutti i dati caricati andranno persi. Sei sicuro di voler annullare?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Continua importazione</AlertDialogCancel><AlertDialogAction onClick={handleConfirmCancel}>Annulla importazione</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
