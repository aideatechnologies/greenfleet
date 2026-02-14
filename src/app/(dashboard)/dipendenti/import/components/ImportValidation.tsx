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
import { FIELD_LABELS } from "@/lib/services/employee-import-service";
import type { ImportValidationResult } from "@/types/import";

type ImportValidationProps = {
  results: ImportValidationResult[];
};

export function ImportValidation({ results }: ImportValidationProps) {
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const validCount = useMemo(
    () => results.filter((r) => r.isValid).length,
    [results]
  );
  const errorCount = results.length - validCount;

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
      </div>

      {/* Filter toggle */}
      {errorCount > 0 && (
        <div className="flex items-center gap-3">
          <Switch
            id="showOnlyErrors"
            checked={showOnlyErrors}
            onCheckedChange={setShowOnlyErrors}
          />
          <Label htmlFor="showOnlyErrors">Mostra solo righe con errori</Label>
        </div>
      )}

      {/* Results table */}
      <div className="rounded-md border overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center">Riga</TableHead>
              <TableHead className="w-[100px]">Stato</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cognome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Codice Fiscale</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead>Errori</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResults.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
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
                          ? "bg-green-600 hover:bg-green-600/90"
                          : ""
                      }
                    >
                      {result.isValid ? "OK" : "Errore"}
                    </Badge>
                  </TableCell>
                  <TableCell>{result.data.firstName || "-"}</TableCell>
                  <TableCell>{result.data.lastName || "-"}</TableCell>
                  <TableCell>{result.data.email || "-"}</TableCell>
                  <TableCell>
                    {result.data.fiscalCode ? (
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                        {result.data.fiscalCode}
                      </code>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{result.data.phone || "-"}</TableCell>
                  <TableCell>
                    {result.errors.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-red-600 dark:text-red-400 space-y-0.5">
                        {result.errors.map((err, i) => (
                          <li key={i}>
                            <span className="font-medium">
                              {FIELD_LABELS[err.field] ?? err.field}:
                            </span>{" "}
                            {err.message}
                          </li>
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
