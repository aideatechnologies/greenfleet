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
import { FuelRecordImportUploader } from "./FuelRecordImportUploader";
import { FuelRecordImportColumnMapping } from "./FuelRecordImportColumnMapping";
import { FuelRecordImportPreview } from "./FuelRecordImportPreview";
import { FuelRecordImportValidation } from "./FuelRecordImportValidation";
import { FuelRecordImportConfirm } from "./FuelRecordImportConfirm";
import { FuelRecordImportResult } from "./FuelRecordImportResult";
import {
  parseCSV,
  parseExcel,
  detectFileType,
  autoMapColumns,
  validateImportRows,
  normalizeLicensePlate,
} from "@/lib/services/fuel-record-import-service";
import {
  importFuelRecordsAction,
  getTenantVehiclePlatesAction,
} from "../../actions/import-fuel-records";
import type { FuelRecordImportConfig } from "@/lib/schemas/fuel-record-import";
import { FUEL_RECORD_REQUIRED_FIELDS } from "@/lib/schemas/fuel-record-import";
import type { FuelRecordImportValidation as FuelRecordImportValidationType } from "@/lib/schemas/fuel-record-import";
import type { FuelRecordImportResult as FuelRecordImportResultType } from "@/lib/schemas/fuel-record-import";
import type { ParsedData, ColumnMapping } from "@/types/import";

const STEPS = [
  { key: "upload", label: "Upload" },
  { key: "mapping", label: "Mappatura" },
  { key: "preview", label: "Anteprima" },
  { key: "validation", label: "Validazione" },
  { key: "confirm", label: "Conferma" },
  { key: "result", label: "Risultato" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function FuelRecordImportWizard() {
  const router = useRouter();

  // Step state
  const [currentStep, setCurrentStep] = useState<StepKey>("upload");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Data state
  const [config, setConfig] = useState<FuelRecordImportConfig>({
    separator: ";",
    hasHeader: true,
    encoding: "UTF-8",
    numberFormat: "IT",
  });
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validationResults, setValidationResults] = useState<
    FuelRecordImportValidationType[]
  >([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [importResult, setImportResult] =
    useState<FuelRecordImportResultType | null>(null);

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
    async (file: File, fileConfig: FuelRecordImportConfig) => {
      try {
        const fileType = detectFileType(file.name);
        let parsed: ParsedData;

        if (fileType === "csv") {
          // Read file with specified encoding
          const decoder = new TextDecoder(fileConfig.encoding);
          const buffer = await file.arrayBuffer();
          const text = decoder.decode(buffer);

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
    const missingRequired = FUEL_RECORD_REQUIRED_FIELDS.filter(
      (f) => !(f in mapping)
    );
    if (missingRequired.length > 0) {
      toast.error(
        "Mappa almeno i campi obbligatori: Targa, Data, Tipo Carburante, Quantita, Importo e Km"
      );
      return;
    }
    goNext();
  }, [mapping, goNext]);

  // Step 3 -> 4: Run validation (fetch vehicle plates from server)
  const handlePreviewNext = useCallback(async () => {
    if (!parsedData) return;

    setIsValidating(true);

    try {
      // Load vehicle plates from server
      const platesResult = await getTenantVehiclePlatesAction();
      if (!platesResult.success) {
        toast.error(platesResult.error);
        setIsValidating(false);
        return;
      }

      // Build plate -> vehicleId map
      const vehiclePlateMap = new Map<string, string>();
      for (const v of platesResult.data) {
        vehiclePlateMap.set(normalizeLicensePlate(v.licensePlate), v.id);
      }

      // Validate all rows
      const results = validateImportRows(
        parsedData.rows,
        mapping,
        parsedData.headers,
        { numberFormat: config.numberFormat },
        vehiclePlateMap
      );

      setValidationResults(results);
      goNext();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Errore durante la validazione";
      toast.error(message);
    } finally {
      setIsValidating(false);
    }
  }, [parsedData, mapping, config.numberFormat, goNext]);

  // Step 5: Execute import
  const handleConfirmImport = useCallback(async () => {
    const validResults = validationResults.filter(
      (r) => r.isValid && r.resolved
    );
    if (validResults.length === 0) {
      toast.error("Nessuna riga valida da importare");
      return;
    }

    setIsImporting(true);

    try {
      const rows = validResults.map((r) => ({
        vehicleId: r.resolved!.vehicleId,
        licensePlate: r.resolved!.licensePlate,
        date: r.resolved!.date.toISOString(),
        fuelType: r.resolved!.fuelType,
        quantityLiters: r.resolved!.quantityLiters,
        amountEur: r.resolved!.amountEur,
        odometerKm: r.resolved!.odometerKm,
        notes: r.resolved!.notes,
      }));

      const result = await importFuelRecordsAction(rows);

      if (result.success) {
        // Merge client-side validation error count with server result
        const errorRowCount = validationResults.filter(
          (r) => !r.isValid
        ).length;
        setImportResult({
          ...result.data,
          totalRows: validationResults.length,
          errorRows: errorRowCount,
          skippedRows: result.data.skippedRows + errorRowCount,
        });
        setCurrentStep("result");

        if (result.data.importedRows > 0) {
          toast.success(
            `${result.data.importedRows} ${result.data.importedRows === 1 ? "rifornimento importato" : "rifornimenti importati"} con successo`
          );
        } else {
          toast.warning("Nessun rifornimento importato");
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
    setConfig({
      separator: ";",
      hasHeader: true,
      encoding: "UTF-8",
      numberFormat: "IT",
    });
    setParsedData(null);
    setMapping({});
    setValidationResults([]);
    setImportResult(null);
    setIsImporting(false);
    setIsValidating(false);
  }, []);

  // Cancel confirmation
  const handleCancel = useCallback(() => {
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(() => {
    setCancelDialogOpen(false);
    router.push("/fuel-records");
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
                } ${isResultStep && !importResult ? "opacity-50" : ""}`}
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
          <FuelRecordImportUploader
            onFileSelected={handleFileSelected}
            config={config}
            onConfigChange={setConfig}
          />
        )}

        {currentStep === "mapping" && parsedData && (
          <FuelRecordImportColumnMapping
            parsedData={parsedData}
            mapping={mapping}
            onMappingChange={setMapping}
          />
        )}

        {currentStep === "preview" && parsedData && (
          <FuelRecordImportPreview parsedData={parsedData} mapping={mapping} />
        )}

        {currentStep === "validation" && (
          <FuelRecordImportValidation results={validationResults} />
        )}

        {currentStep === "confirm" && (
          <FuelRecordImportConfirm
            totalRows={validationResults.length}
            validRows={validRowCount}
            errorRows={errorRowCount}
            isImporting={isImporting}
            onConfirmImport={handleConfirmImport}
          />
        )}

        {currentStep === "result" && importResult && (
          <FuelRecordImportResult
            result={importResult}
            onReset={handleReset}
          />
        )}
      </div>

      {/* Navigation buttons */}
      {currentStep !== "upload" &&
        currentStep !== "result" &&
        currentStep !== "confirm" && (
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              variant="ghost"
              onClick={handleCancel}
              disabled={isImporting || isValidating}
            >
              Annulla
            </Button>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={goBack}
                disabled={isImporting || isValidating}
              >
                Indietro
              </Button>
              {currentStep === "mapping" && (
                <Button onClick={handleMappingNext}>Avanti</Button>
              )}
              {currentStep === "preview" && (
                <Button onClick={handlePreviewNext} disabled={isValidating}>
                  {isValidating ? "Validazione..." : "Avanti"}
                </Button>
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
            <AlertDialogTitle>
              Annullare l&apos;importazione?
            </AlertDialogTitle>
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
