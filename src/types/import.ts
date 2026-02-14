export type ParsedData = {
  headers: string[];
  rows: string[][];
};

export type ColumnMapping = Record<string, number>; // field name -> column index

export type ImportValidationResult = {
  rowIndex: number;
  data: Record<string, string>;
  errors: { field: string; message: string }[];
  isValid: boolean;
};

export type ImportSummary = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  skippedRows: number;
  errors: ImportValidationResult[];
};
