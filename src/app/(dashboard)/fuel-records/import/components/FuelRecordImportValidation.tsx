"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FUEL_RECORD_FIELD_LABELS } from "@/lib/schemas/fuel-record-import";
import type { FuelRecordImportValidation as FuelRecordImportValidationType } from "@/lib/schemas/fuel-record-import";

type FuelRecordImportValidationProps = {
  results: FuelRecordImportValidationType[];
};

export function FuelRecordImportValidation({
  results,
}: FuelRecordImportValidationProps) {
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const validCount = useMemo(
    () => results.filter((r) => r.isValid).length,
    [results]
  );
  const errorCount = results.length - validCount;
  const warningCount = useMemo(
    () => results.filter((r) => r.warnings.length > 0).length,
    [results]
  );

  const filteredResults = useMemo(
    () => (showOnlyErrors ? results.filter((r) => !r.isValid) : results),
    [results, showOnlyErrors]
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4">
        <div className="rounded-md border px-4 py-3">
          <p className="text-xs text-muted-foreground">Totale righe</p>
          <p className="text-2xl font-bold">{results.length}</p>
        </div>
        <div className="rounded-md border px-4 py-3 border-green-200 dark:border-green-800">
          <p className="text-xs text-muted-foreground">Valide</p>
          <p className="text-2xl font-bold text-green-600">{validCount}</p>
        </div>
        <div className="rounded-md border px-4 py-3 border-red-200 dark:border-red-800">
          <p className="text-xs text-muted-foreground">Con errori</p>
          <p className="text-2xl font-bold text-red-600">{errorCount}</p>
        </div>
        {warningCount > 0 && (
          <div className="rounded-md border px-4 py-3 border-amber-200 dark:border-amber-800">
            <p className="text-xs text-muted-foreground">Con avvisi</p>
            <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
          </div>
        )}
      </div>

      {/* Filter toggle */}
      {errorCount > 0 && (
        <div className="flex items-center gap-3">
          <Switch
            id="showOnlyErrors"
            checked={showOnlyErrors}
            onCheckedChange={setShowOnlyErrors}
          />
          <Label htmlFor="showOnlyErrors">
            Mostra solo righe con errori
          </Label>
        </div>
      )}

      {/* Results table */}
      <div className="rounded-md border overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center">Riga</TableHead>
              <TableHead className="w-[100px]">Stato</TableHead>
              <TableHead>Targa</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Carburante</TableHead>
              <TableHead>Litri</TableHead>
              <TableHead>EUR</TableHead>
              <TableHead>Km</TableHead>
              <TableHead>Dettagli</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResults.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-muted-foreground"
                >
                  {showOnlyErrors
                    ? "Nessuna riga con errori"
                    : "Nessun risultato"}
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.map((result) => (
                <TableRow
                  key={result.rowIndex}
                  className={
                    !result.isValid
                      ? "bg-red-50/50 dark:bg-red-950/10"
                      : result.warnings.length > 0
                        ? "bg-amber-50/50 dark:bg-amber-950/10"
                        : ""
                  }
                >
                  <TableCell className="text-center text-muted-foreground text-xs">
                    {result.rowIndex + 1}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={result.isValid ? "default" : "destructive"}
                      className={
                        result.isValid
                          ? result.warnings.length > 0
                            ? "bg-amber-600 hover:bg-amber-600/90"
                            : "bg-green-600 hover:bg-green-600/90"
                          : ""
                      }
                    >
                      {result.isValid
                        ? result.warnings.length > 0
                          ? "Avviso"
                          : "OK"
                        : "Errore"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {result.data.licensePlate || "-"}
                    </code>
                  </TableCell>
                  <TableCell>{result.data.date || "-"}</TableCell>
                  <TableCell>{result.data.fuelType || "-"}</TableCell>
                  <TableCell>{result.data.quantityLiters || "-"}</TableCell>
                  <TableCell>{result.data.amountEur || "-"}</TableCell>
                  <TableCell>{result.data.odometerKm || "-"}</TableCell>
                  <TableCell>
                    {result.errors.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-red-600 dark:text-red-400 space-y-0.5">
                        {result.errors.map((err, i) => (
                          <li key={i}>
                            <span className="font-medium">
                              {FUEL_RECORD_FIELD_LABELS[err.field] ?? err.field}
                              :
                            </span>{" "}
                            {err.message}
                          </li>
                        ))}
                      </ul>
                    ) : result.warnings.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                        {result.warnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
