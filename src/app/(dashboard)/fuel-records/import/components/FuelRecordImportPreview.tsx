"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FUEL_RECORD_FIELD_LABELS,
  FUEL_RECORD_IMPORTABLE_FIELDS,
  FUEL_RECORD_REQUIRED_FIELDS,
} from "@/lib/schemas/fuel-record-import";
import type { ColumnMapping, ParsedData } from "@/types/import";

const PREVIEW_ROWS = 20;

type FuelRecordImportPreviewProps = {
  parsedData: ParsedData;
  mapping: ColumnMapping;
};

export function FuelRecordImportPreview({
  parsedData,
  mapping,
}: FuelRecordImportPreviewProps) {
  const { rows } = parsedData;
  const previewRows = rows.slice(0, PREVIEW_ROWS);

  // Only show mapped fields
  const mappedFields = FUEL_RECORD_IMPORTABLE_FIELDS.filter(
    (f) => f in mapping
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Anteprima delle prime {Math.min(PREVIEW_ROWS, rows.length)} righe su{" "}
          {rows.length} totali. Clicca &quot;Avanti&quot; per avviare la
          validazione dei dati.
        </p>
      </div>

      <div className="rounded-md border overflow-auto max-h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center">#</TableHead>
              {mappedFields.map((field) => (
                <TableHead key={field}>
                  {FUEL_RECORD_FIELD_LABELS[field]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell className="text-center text-muted-foreground text-xs">
                  {rowIndex + 1}
                </TableCell>
                {mappedFields.map((field) => {
                  const colIndex = mapping[field];
                  const value = row[colIndex]?.trim() ?? "";
                  const isEmpty = value === "";
                  const isRequired = FUEL_RECORD_REQUIRED_FIELDS.includes(field);
                  const hasAnomaly = isRequired && isEmpty;

                  return (
                    <TableCell
                      key={field}
                      className={
                        hasAnomaly
                          ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300"
                          : isEmpty
                            ? "text-muted-foreground italic"
                            : ""
                      }
                    >
                      {isEmpty ? (
                        isRequired ? (
                          "Valore mancante"
                        ) : (
                          "-"
                        )
                      ) : (
                        value
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          Totale righe:{" "}
          <span className="font-medium text-foreground">{rows.length}</span>
        </p>
        {rows.length > PREVIEW_ROWS && (
          <p>
            ({rows.length - PREVIEW_ROWS} righe non mostrate in anteprima)
          </p>
        )}
      </div>
    </div>
  );
}
