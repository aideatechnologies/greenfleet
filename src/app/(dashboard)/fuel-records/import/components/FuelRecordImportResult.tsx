"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Fuel } from "lucide-react";
import type { FuelRecordImportResult as FuelRecordImportResultType } from "@/lib/schemas/fuel-record-import";

type FuelRecordImportResultProps = {
  result: FuelRecordImportResultType;
  onReset: () => void;
};

export function FuelRecordImportResult({
  result,
  onReset,
}: FuelRecordImportResultProps) {
  const hasErrors = result.errorRows > 0 || result.skippedRows > 0;
  const allFailed = result.importedRows === 0;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {allFailed ? (
              <AlertTriangle className="h-16 w-16 text-red-500" />
            ) : hasErrors ? (
              <AlertTriangle className="h-16 w-16 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            )}

            <div>
              <h3 className="text-xl font-semibold">
                {allFailed
                  ? "Importazione fallita"
                  : hasErrors
                    ? "Importazione completata con avvisi"
                    : "Importazione completata"}
              </h3>
              <p className="mt-1 text-muted-foreground">
                {allFailed
                  ? "Nessun rifornimento importato."
                  : `${result.importedRows} ${result.importedRows === 1 ? "rifornimento importato" : "rifornimenti importati"} con successo.`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Durata: {formatDuration(result.durationMs)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-md border px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Totale righe</p>
              <p className="text-xl font-bold">{result.totalRows}</p>
            </div>
            <div className="rounded-md border border-green-200 dark:border-green-800 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Importati</p>
              <p className="text-xl font-bold text-green-600">
                {result.importedRows}
              </p>
            </div>
            <div className="rounded-md border border-amber-200 dark:border-amber-800 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Ignorati</p>
              <p className="text-xl font-bold text-amber-600">
                {result.skippedRows}
              </p>
            </div>
            <div className="rounded-md border border-red-200 dark:border-red-800 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Con errori</p>
              <p className="text-xl font-bold text-red-600">
                {result.errorRows}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/fuel-records">
            <Fuel className="mr-2 h-4 w-4" />
            Vai alla lista rifornimenti
          </Link>
        </Button>
        <Button variant="secondary" onClick={onReset}>
          Importa altro file
        </Button>
      </div>
    </div>
  );
}
