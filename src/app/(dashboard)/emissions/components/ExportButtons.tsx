"use client";

// ---------------------------------------------------------------------------
// ExportButtons — PDF & CSV export actions (Story 6.6)
// ---------------------------------------------------------------------------
// Standalone component. Does NOT modify EmissionDashboard or other components.
// Will be integrated into the emissions page layout after all agents complete.
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import { FileDown, Table, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { AggregationLevel } from "@/types/report";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportButtonsProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  aggregationLevel: AggregationLevel;
  carlistId?: string;
  includeVehicleDetail?: boolean;
  includeMethodology?: boolean;
  disabled?: boolean;
}

type CSVSeparatorOption = {
  label: string;
  value: string;
};

const CSV_SEPARATOR_OPTIONS: CSVSeparatorOption[] = [
  { label: "Punto e virgola (;)", value: ";" },
  { label: "Virgola (,)", value: "," },
  { label: "Tabulazione", value: "\t" },
];

// ---------------------------------------------------------------------------
// Helper: build export URL query string
// ---------------------------------------------------------------------------

function buildExportParams(
  props: ExportButtonsProps,
  overrides?: { csvSeparator?: string }
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("startDate", props.dateRange.startDate.toISOString());
  params.set("endDate", props.dateRange.endDate.toISOString());
  params.set("aggregationLevel", props.aggregationLevel);
  params.set(
    "includeVehicleDetail",
    String(props.includeVehicleDetail ?? true)
  );
  params.set("includeMethodology", String(props.includeMethodology ?? true));
  if (props.carlistId) {
    params.set("carlistId", props.carlistId);
  }
  if (overrides?.csvSeparator) {
    params.set("csvSeparator", overrides.csvSeparator);
  }
  return params;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExportButtons(props: ExportButtonsProps) {
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingCSV, setLoadingCSV] = useState(false);

  // ------ PDF Export ------
  const handleExportPDF = useCallback(async () => {
    setLoadingPDF(true);
    try {
      const params = buildExportParams(props);
      const url = `/api/export/pdf?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error ?? `Errore HTTP ${response.status}`
        );
      }

      // Download the blob
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="?(.+?)"?$/);
      const filename = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : "report-emissioni.pdf";

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast.success("PDF esportato con successo");
    } catch (error) {
      console.error("[ExportButtons] PDF export error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante l'esportazione PDF"
      );
    } finally {
      setLoadingPDF(false);
    }
  }, [props]);

  // ------ CSV Export ------
  const handleExportCSV = useCallback(
    async (separator: string = ";") => {
      setLoadingCSV(true);
      try {
        const params = buildExportParams(props, { csvSeparator: separator });
        const url = `/api/export/csv?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error ?? `Errore HTTP ${response.status}`
          );
        }

        // Download the blob
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);

        const contentDisposition = response.headers.get("Content-Disposition");
        const filenameMatch = contentDisposition?.match(/filename="?(.+?)"?$/);
        const filename = filenameMatch
          ? decodeURIComponent(filenameMatch[1])
          : "report-emissioni.csv";

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        toast.success("CSV esportato con successo");
      } catch (error) {
        console.error("[ExportButtons] CSV export error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Errore durante l'esportazione CSV"
        );
      } finally {
        setLoadingCSV(false);
      }
    },
    [props]
  );

  const isLoading = loadingPDF || loadingCSV;

  return (
    <div className="flex items-center gap-2">
      {/* PDF Export Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        disabled={props.disabled || isLoading}
      >
        {loadingPDF ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 size-4" />
        )}
        Esporta PDF
      </Button>

      {/* CSV Export with separator dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={props.disabled || isLoading}
          >
            {loadingCSV ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Table className="mr-2 size-4" />
            )}
            Esporta CSV
            <ChevronDown className="ml-1 size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {CSV_SEPARATOR_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleExportCSV(option.value)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
