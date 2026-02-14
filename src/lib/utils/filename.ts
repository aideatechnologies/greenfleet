// ---------------------------------------------------------------------------
// Export filename utilities (Story 6.6)
// ---------------------------------------------------------------------------

/**
 * Slugify a string: lowercase, remove accents (NFD + strip combining marks),
 * replace non-alphanumeric characters with hyphens, collapse multiple hyphens.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .replace(/-{2,}/g, "-"); // collapse multiple hyphens
}

/**
 * Generate a standardized export filename.
 *
 * Format: greenfleet_{tenant}_{startYYYY-MM}_{endYYYY-MM}_{dateYYYYMMDD}.{ext}
 *
 * Example: greenfleet_acme-corp_2025-01_2025-12_20260210.pdf
 */
export function generateExportFilename(params: {
  tenantName: string;
  startDate: Date;
  endDate: Date;
  format: "pdf" | "csv";
}): string {
  const { tenantName, startDate, endDate, format } = params;

  const tenant = slugify(tenantName);

  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
  const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}`;

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  return `greenfleet_${tenant}_${startStr}_${endStr}_${dateStr}.${format}`;
}
