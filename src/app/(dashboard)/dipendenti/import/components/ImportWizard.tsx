"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { ImportUploader } from "./ImportUploader";
import { ImportColumnMapping } from "./ImportColumnMapping";
import { ImportPreview } from "./ImportPreview";
import { ImportValidation } from "./ImportValidation";
import { ImportConfirm } from "./ImportConfirm";
import { ImportResult } from "./ImportResult";
import {
  parseCSV,
  parseExcel,
  detectFileType,
  autoMapColumns,
  validateRows,
  checkDuplicates,
  REQUIRED_FIELDS,
} from "@/lib/services/employee-import-service";
import { importEmployeesAction } from "../actions/import-employees";
import type { EmployeeImportConfig } from "@/lib/schemas/employee-import";
import type {
  ParsedData,
  ColumnMapping,
  ImportValidationResult,
  ImportSummary,
} from "@/types/import";

const STEPS = [
  { key: "upload", label: "Upload" },
  { key: "mapping", label: "Mappatura" },
  { key: "preview", label: "Anteprima" },
  { key: "validation", label: "Validazione" },
  { key: "confirm", label: "Conferma" },
  { key: "result", label: "Risultato" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function ImportWizard() {
  const router = useRouter();

  // Step state
  const [currentStep, setCurrentStep] = useState<StepKey>("upload");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Data state
  const [config, setConfig] = useState<EmployeeImportConfig>({
    separator: ",",
    hasHeader: true,
  });
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validationResults, setValidationResults] = useState<
    ImportValidationResult[]
  >([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(
    null
  );

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  // Navigate between steps
  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key);
    }
  }, [currentStepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key);
    }
  }, [currentStepIndex]);

  // Step 1: File upload + parse
  const handleFileSelected = useCallback(
    async (file: File, fileConfig: EmployeeImportConfig) => {
      try {
        const fileType = detectFileType(file.name);
        let parsed: ParsedData;

        if (fileType === "csv") {
          const text = await file.text();
          parsed = parseCSV(text, {
            separator: fileConfig.separator,
            hasHeader: fileConfig.hasHeader,
          });
        } else {
          const buffer = await file.arrayBuffer();
          parsed = parseExcel(buffer);
        }

        if (parsed.rows.length === 0) {
          toast.error("Il file non contiene dati da importare");
          return;
        }

        setParsedData(parsed);

        // Auto-map columns
        const autoMapping = autoMapColumns(parsed.headers);
        setMapping(autoMapping);

        goNext();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Errore nel parsing del file";
        toast.error(message);
      }
    },
    [goNext]
  );

  // Step 2 -> 3: Validate mapping and go to preview
  const handleMappingNext = useCallback(() => {
    const missingRequired = REQUIRED_FIELDS.filter((f) => !(f in mapping));
    if (missingRequired.length > 0) {
      toast.error("Mappa almeno i campi obbligatori: Nome e Cognome");
      return;
    }
    goNext();
  }, [mapping, goNext]);

  // Step 3 -> 4: Run validation
  const handlePreviewNext = useCallback(() => {
    if (!parsedData) return;

    const results = validateRows(parsedData.rows, mapping, parsedData.headers);
    // Check duplicates (we pass empty array for existing since we do server-side check)
    const withDuplicates = checkDuplicates(results, []);
    setValidationResults(withDuplicates);
    goNext();
  }, [parsedData, mapping, goNext]);

  // Step 5: Execute import
  const handleConfirmImport = useCallback(async () => {
    const validResults = validationResults.filter((r) => r.isValid);
    if (validResults.length === 0) {
      toast.error("Nessuna riga valida da importare");
      return;
    }

    setIsImporting(true);

    try {
      const rows = validResults.map((r) => ({
        firstName: r.data.firstName,
        lastName: r.data.lastName,
        email: r.data.email || undefined,
        phone: r.data.phone || undefined,
        fiscalCode: r.data.fiscalCode || undefined,
      }));

      const result = await importEmployeesAction(rows);

      if (result.success) {
        setImportSummary(result.data);
        setCurrentStep("result");

        if (result.data.importedRows > 0) {
          toast.success(
            `${result.data.importedRows} ${result.data.importedRows === 1 ? "dipendente importato" : "dipendenti importati"} con successo`
          );
        } else {
          toast.warning("Nessun dipendente importato");
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

  // Reset wizard
  const handleReset = useCallback(() => {
    setCurrentStep("upload");
    setConfig({ separator: ",", hasHeader: true });
    setParsedData(null);
    setMapping({});
    setValidationResults([]);
    setImportSummary(null);
    setIsImporting(false);
  }, []);

  // Cancel confirmation
  const handleCancel = useCallback(() => {
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(() => {
    setCancelDialogOpen(false);
    router.push("/dipendenti");
  }, [router]);

  const validRowCount = validationResults.filter((r) => r.isValid).length;
  const errorRowCount = validationResults.length - validRowCount;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const isCurrent = step.key === currentStep;
          const isCompleted = index < currentStepIndex;
          const isResultStep = step.key === "result";

          return (
            <div key={step.key} className="flex items-center gap-2">
              {index > 0 && (
                <div
                  className={`h-[2px] w-8 ${
                    isCompleted ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                } ${isResultStep && !importSummary ? "opacity-50" : ""}`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px]">
                  {index + 1}
                </span>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">
        {currentStep === "upload" && (
          <ImportUploader
            onFileSelected={handleFileSelected}
            config={config}
            onConfigChange={setConfig}
          />
        )}

        {currentStep === "mapping" && parsedData && (
          <ImportColumnMapping
            parsedData={parsedData}
            mapping={mapping}
            onMappingChange={setMapping}
          />
        )}

        {currentStep === "preview" && parsedData && (
          <ImportPreview parsedData={parsedData} mapping={mapping} />
        )}

        {currentStep === "validation" && (
          <ImportValidation results={validationResults} />
        )}

        {currentStep === "confirm" && (
          <ImportConfirm
            totalRows={validationResults.length}
            validRows={validRowCount}
            errorRows={errorRowCount}
            isImporting={isImporting}
            onConfirmImport={handleConfirmImport}
          />
        )}

        {currentStep === "result" && importSummary && (
          <ImportResult summary={importSummary} onReset={handleReset} />
        )}
      </div>

      {/* Navigation buttons (not shown on upload and result steps) */}
      {currentStep !== "upload" && currentStep !== "result" && currentStep !== "confirm" && (
        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={handleCancel} disabled={isImporting}>
            Annulla
          </Button>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={goBack}
              disabled={isImporting}
            >
              Indietro
            </Button>
            {currentStep === "mapping" && (
              <Button onClick={handleMappingNext}>Avanti</Button>
            )}
            {currentStep === "preview" && (
              <Button onClick={handlePreviewNext}>Avanti</Button>
            )}
            {currentStep === "validation" && (
              <Button onClick={goNext} disabled={validRowCount === 0}>
                Avanti
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Back button on confirm step */}
      {currentStep === "confirm" && !isImporting && (
        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="ghost" onClick={handleCancel}>
            Annulla
          </Button>
          <Button variant="secondary" onClick={goBack}>
            Indietro
          </Button>
        </div>
      )}

      {/* Cancel on upload step */}
      {currentStep === "upload" && (
        <div className="flex items-center border-t pt-4">
          <Button variant="ghost" onClick={handleCancel}>
            Annulla
          </Button>
        </div>
      )}

      {/* Cancel confirmation dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annullare l&apos;importazione?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i dati caricati andranno persi. Sei sicuro di voler
              annullare?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continua importazione</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>
              Annulla importazione
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
