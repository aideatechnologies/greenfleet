// ---------------------------------------------------------------------------
// CSV export utility — Italian locale (BOM + semicolons for Excel)
// ---------------------------------------------------------------------------

type CsvFormat = "integer" | "decimal2" | "percentage" | "string";

export type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
  format?: CsvFormat;
};

function escapeCell(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatNumber(value: number, fmt: CsvFormat): string {
  switch (fmt) {
    case "integer":
      return Math.round(value).toString();
    case "decimal2":
      return value.toFixed(2).replace(".", ",");
    case "percentage":
      return value.toFixed(1).replace(".", ",") + "%";
    default:
      return String(value);
  }
}

export function exportToCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  data: T[]
): void {
  const BOM = "\uFEFF";
  const separator = ";";

  const headerRow = columns.map((c) => escapeCell(c.header)).join(separator);

  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = col.accessor(row);
        if (raw === null || raw === undefined) return "";
        if (typeof raw === "number") {
          return formatNumber(raw, col.format ?? "string");
        }
        return escapeCell(String(raw));
      })
      .join(separator)
  );

  const csv = BOM + [headerRow, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
