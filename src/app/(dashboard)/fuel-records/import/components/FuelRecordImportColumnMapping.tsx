"use client";

import { useCallback, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  FUEL_RECORD_FIELD_LABELS,
  FUEL_RECORD_IMPORTABLE_FIELDS,
  FUEL_RECORD_REQUIRED_FIELDS,
} from "@/lib/schemas/fuel-record-import";
import type { ColumnMapping, ParsedData } from "@/types/import";

type FuelRecordImportColumnMappingProps = {
  parsedData: ParsedData;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
};

const UNMAPPED_VALUE = "__unmapped__";

export function FuelRecordImportColumnMapping({
  parsedData,
  mapping,
  onMappingChange,
}: FuelRecordImportColumnMappingProps) {
  const { headers, rows } = parsedData;

  // Get first row preview values
  const previewRow = rows[0] ?? [];

  // Fields already mapped
  const mappedFields = useMemo(
    () => new Set(Object.keys(mapping)),
    [mapping]
  );

  // Column indices already used by other fields
  const usedIndices = useMemo(
    () => new Set(Object.values(mapping)),
    [mapping]
  );

  const handleFieldChange = useCallback(
    (colIndex: number, fieldName: string) => {
      const newMapping = { ...mapping };

      // Remove any existing mapping for this column index
      for (const [field, idx] of Object.entries(newMapping)) {
        if (idx === colIndex) {
          delete newMapping[field];
        }
      }

      // If selecting a field (not "unmapped"), remove that field from any other column
      if (fieldName !== UNMAPPED_VALUE) {
        delete newMapping[fieldName];
        newMapping[fieldName] = colIndex;
      }

      onMappingChange(newMapping);
    },
    [mapping, onMappingChange]
  );

  // Get the field mapped to a specific column index
  const getFieldForColumn = useCallback(
    (colIndex: number): string => {
      for (const [field, idx] of Object.entries(mapping)) {
        if (idx === colIndex) return field;
      }
      return UNMAPPED_VALUE;
    },
    [mapping]
  );

  // Check if required fields are mapped
  const missingRequired = FUEL_RECORD_REQUIRED_FIELDS.filter(
    (f) => !mappedFields.has(f)
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Associa le colonne del file ai campi di Greenfleet. I campi{" "}
          <span className="font-medium text-foreground">
            Targa, Data, Tipo Carburante, Quantita, Importo e Km
          </span>{" "}
          sono obbligatori.
        </p>
      </div>

      {missingRequired.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Campi obbligatori mancanti:{" "}
            {missingRequired
              .map((f) => FUEL_RECORD_FIELD_LABELS[f])
              .join(", ")}
          </p>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Colonna file</TableHead>
              <TableHead className="w-[200px]">Valore anteprima</TableHead>
              <TableHead className="w-[250px]">Campo Greenfleet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headers.map((header, colIndex) => {
              const currentField = getFieldForColumn(colIndex);
              const isRequired =
                currentField !== UNMAPPED_VALUE &&
                FUEL_RECORD_REQUIRED_FIELDS.includes(currentField);

              return (
                <TableRow key={colIndex}>
                  <TableCell className="font-medium">
                    {header}
                    {isRequired && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Obbligatorio
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {previewRow[colIndex] ?? (
                      <span className="italic">vuoto</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={currentField}
                      onValueChange={(value) =>
                        handleFieldChange(colIndex, value)
                      }
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Non mappato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNMAPPED_VALUE}>
                          -- Non mappato --
                        </SelectItem>
                        {FUEL_RECORD_IMPORTABLE_FIELDS.map((field) => {
                          const canSelect =
                            currentField === field ||
                            !usedIndices.has(mapping[field]);
                          const isMapped =
                            field in mapping && mapping[field] !== colIndex;

                          return (
                            <SelectItem
                              key={field}
                              value={field}
                              disabled={!canSelect && isMapped}
                            >
                              {FUEL_RECORD_FIELD_LABELS[field]}
                              {FUEL_RECORD_REQUIRED_FIELDS.includes(field)
                                ? " *"
                                : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Totale righe dati nel file: {rows.length}
      </p>
    </div>
  );
}
