// ---------------------------------------------------------------------------
// CSV Export Service (Story 6.6)
// ---------------------------------------------------------------------------
// Generates a CSV string from ReportExportData using papaparse unparse.
// UTF-8 BOM for Excel compatibility, configurable separator, Italian decimals.
// ---------------------------------------------------------------------------

import Papa from "papaparse";
import type { ReportExportData, CSVOptions } from "@/types/report";

// ---------------------------------------------------------------------------
// Default options
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: CSVOptions = {
  separator: ";",
  decimalSeparator: ",",
  includeHeaders: true,
};

// ---------------------------------------------------------------------------
// Main export function
// ---------------------------------------------------------------------------

export function generateCSV(
  data: ReportExportData,
  options?: Partial<CSVOptions>
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];

  // UTF-8 BOM
  const BOM = "\uFEFF";

  // Metadata comment line
  const generatedAt = formatDateIT(data.metadata.generatedAt);
  const periodStart = formatDateIT(data.dateRange.startDate);
  const periodEnd = formatDateIT(data.dateRange.endDate);

  lines.push(
    `# Report Emissioni Greenfleet - ${data.tenantName} - Periodo ${periodStart} - ${periodEnd} - Generato il ${generatedAt}`
  );
  lines.push("");

  // Section: Aggregation data
  const aggregationLabel = getAggregationLabel(data.aggregationLevel);
  lines.push(`# Dati aggregati per: ${aggregationLabel}`);

  const aggregationRows = data.aggregations.map((agg) => {
    const totalReal = data.metadata.totalRealEmissions;
    const contribution = totalReal === 0 ? 0 : (agg.realEmissions / totalReal) * 100;

    return {
      Gruppo: agg.label,
      "Emissioni Teoriche (kgCO2e)": formatNumber(
        agg.theoreticalEmissions,
        opts.decimalSeparator
      ),
      "Emissioni Reali (kgCO2e)": formatNumber(
        agg.realEmissions,
        opts.decimalSeparator
      ),
      "Delta (kgCO2e)": formatNumber(
        agg.deltaAbsolute,
        opts.decimalSeparator
      ),
      "Delta (%)": formatNumber(agg.deltaPercentage, opts.decimalSeparator),
      "Km Totali": formatNumber(agg.totalKm, opts.decimalSeparator),
      "Litri Totali": formatNumber(agg.totalFuel, opts.decimalSeparator),
      "Contributo (%)": formatNumber(
        Math.round(contribution * 100) / 100,
        opts.decimalSeparator
      ),
    };
  });

  // Totals row
  aggregationRows.push({
    Gruppo: "TOTALE",
    "Emissioni Teoriche (kgCO2e)": formatNumber(
      data.metadata.totalTheoreticalEmissions,
      opts.decimalSeparator
    ),
    "Emissioni Reali (kgCO2e)": formatNumber(
      data.metadata.totalRealEmissions,
      opts.decimalSeparator
    ),
    "Delta (kgCO2e)": formatNumber(
      data.metadata.totalDeltaAbsolute,
      opts.decimalSeparator
    ),
    "Delta (%)": formatNumber(
      data.metadata.totalDeltaPercentage,
      opts.decimalSeparator
    ),
    "Km Totali": formatNumber(
      data.metadata.totalKm,
      opts.decimalSeparator
    ),
    "Litri Totali": formatNumber(
      data.metadata.totalFuel,
      opts.decimalSeparator
    ),
    "Contributo (%)": formatNumber(100, opts.decimalSeparator),
  });

  const aggregationCSV = Papa.unparse(aggregationRows, {
    delimiter: opts.separator,
    header: opts.includeHeaders,
    quotes: true,
  });

  lines.push(aggregationCSV);

  // Optional: Vehicle detail section
  if (data.vehicleDetails && data.vehicleDetails.length > 0) {
    lines.push("");
    lines.push("# Dettaglio per veicolo");

    const vehicleRows = data.vehicleDetails.map((v) => ({
      Targa: v.plate,
      Marca: v.make,
      Modello: v.model,
      Alimentazione: v.fuelType,
      "Km Percorsi": formatNumber(v.km, opts.decimalSeparator),
      "Emissioni Teoriche (kgCO2e)": formatNumber(
        v.theoreticalEmissions,
        opts.decimalSeparator
      ),
      "Emissioni Reali (kgCO2e)": formatNumber(
        v.realEmissions,
        opts.decimalSeparator
      ),
      "Delta (kgCO2e)": formatNumber(v.delta, opts.decimalSeparator),
      "Delta (%)": formatNumber(v.deltaPercentage, opts.decimalSeparator),
    }));

    const vehicleCSV = Papa.unparse(vehicleRows, {
      delimiter: opts.separator,
      header: opts.includeHeaders,
      quotes: true,
    });

    lines.push(vehicleCSV);
  }

  // Methodology section
  if (data.methodology.technicalDataSource) {
    lines.push("");
    lines.push("# Metodologia");
    lines.push(`# Fonte dati tecnici: ${data.methodology.technicalDataSource}`);
    lines.push(`# Formula teorica: ${data.methodology.theoreticalFormula}`);
    lines.push(`# Formula reale: ${data.methodology.realFormula}`);
    lines.push(
      `# Fonte fattori emissione: ${data.methodology.emissionFactorSource}`
    );
    lines.push(`# Periodo: ${data.methodology.period}`);
    lines.push(`# Perimetro: ${data.methodology.perimeter}`);

    if (data.methodology.emissionFactors.length > 0) {
      lines.push("# Fattori di emissione utilizzati:");
      for (const ef of data.methodology.emissionFactors) {
        lines.push(
          `#   ${ef.fuelType}: ${formatNumber(ef.value, opts.decimalSeparator)} ${ef.unit}`
        );
      }
    }
  }

  return BOM + lines.join("\n");
}

// ---------------------------------------------------------------------------
// Streaming CSV for large datasets (>1000 rows)
// ---------------------------------------------------------------------------

export function generateCSVStream(
  data: ReportExportData,
  options?: Partial<CSVOptions>
): ReadableStream<Uint8Array> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      // BOM
      controller.enqueue(encoder.encode("\uFEFF"));

      // Metadata
      const generatedAt = formatDateIT(data.metadata.generatedAt);
      const periodStart = formatDateIT(data.dateRange.startDate);
      const periodEnd = formatDateIT(data.dateRange.endDate);
      controller.enqueue(
        encoder.encode(
          `# Report Emissioni Greenfleet - ${data.tenantName} - Periodo ${periodStart} - ${periodEnd} - Generato il ${generatedAt}\n\n`
        )
      );

      // Aggregation header
      const aggregationLabel = getAggregationLabel(data.aggregationLevel);
      controller.enqueue(
        encoder.encode(`# Dati aggregati per: ${aggregationLabel}\n`)
      );

      // Headers
      if (opts.includeHeaders) {
        const headerRow = [
          "Gruppo",
          "Emissioni Teoriche (kgCO2e)",
          "Emissioni Reali (kgCO2e)",
          "Delta (kgCO2e)",
          "Delta (%)",
          "Km Totali",
          "Litri Totali",
          "Contributo (%)",
        ]
          .map((h) => `"${h}"`)
          .join(opts.separator);
        controller.enqueue(encoder.encode(headerRow + "\n"));
      }

      // Aggregation rows
      const totalReal = data.metadata.totalRealEmissions;
      for (const agg of data.aggregations) {
        const contribution =
          totalReal === 0
            ? 0
            : Math.round(((agg.realEmissions / totalReal) * 100) * 100) / 100;

        const row = [
          `"${agg.label}"`,
          formatNumber(agg.theoreticalEmissions, opts.decimalSeparator),
          formatNumber(agg.realEmissions, opts.decimalSeparator),
          formatNumber(agg.deltaAbsolute, opts.decimalSeparator),
          formatNumber(agg.deltaPercentage, opts.decimalSeparator),
          formatNumber(agg.totalKm, opts.decimalSeparator),
          formatNumber(agg.totalFuel, opts.decimalSeparator),
          formatNumber(contribution, opts.decimalSeparator),
        ].join(opts.separator);
        controller.enqueue(encoder.encode(row + "\n"));
      }

      // Totals
      const totalsRow = [
        '"TOTALE"',
        formatNumber(data.metadata.totalTheoreticalEmissions, opts.decimalSeparator),
        formatNumber(data.metadata.totalRealEmissions, opts.decimalSeparator),
        formatNumber(data.metadata.totalDeltaAbsolute, opts.decimalSeparator),
        formatNumber(data.metadata.totalDeltaPercentage, opts.decimalSeparator),
        formatNumber(data.metadata.totalKm, opts.decimalSeparator),
        formatNumber(data.metadata.totalFuel, opts.decimalSeparator),
        formatNumber(100, opts.decimalSeparator),
      ].join(opts.separator);
      controller.enqueue(encoder.encode(totalsRow + "\n"));

      // Vehicle details (streamed)
      if (data.vehicleDetails && data.vehicleDetails.length > 0) {
        controller.enqueue(encoder.encode("\n# Dettaglio per veicolo\n"));

        if (opts.includeHeaders) {
          const vHeaders = [
            "Targa",
            "Marca",
            "Modello",
            "Alimentazione",
            "Km Percorsi",
            "Emissioni Teoriche (kgCO2e)",
            "Emissioni Reali (kgCO2e)",
            "Delta (kgCO2e)",
            "Delta (%)",
          ]
            .map((h) => `"${h}"`)
            .join(opts.separator);
          controller.enqueue(encoder.encode(vHeaders + "\n"));
        }

        for (const v of data.vehicleDetails) {
          const row = [
            `"${v.plate}"`,
            `"${v.make}"`,
            `"${v.model}"`,
            `"${v.fuelType}"`,
            formatNumber(v.km, opts.decimalSeparator),
            formatNumber(v.theoreticalEmissions, opts.decimalSeparator),
            formatNumber(v.realEmissions, opts.decimalSeparator),
            formatNumber(v.delta, opts.decimalSeparator),
            formatNumber(v.deltaPercentage, opts.decimalSeparator),
          ].join(opts.separator);
          controller.enqueue(encoder.encode(row + "\n"));
        }
      }

      controller.close();
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a number for CSV export.
 * - No thousands separator (for import compatibility)
 * - Uses configured decimal separator (default: comma)
 */
function formatNumber(value: number, decimalSeparator: string): string {
  const str = value.toFixed(2);
  if (decimalSeparator === ",") {
    return str.replace(".", ",");
  }
  return str;
}

function formatDateIT(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getAggregationLabel(level: string): string {
  switch (level) {
    case "VEHICLE":
      return "Veicolo";
    case "CARLIST":
      return "Carlist";
    case "FUEL_TYPE":
      return "Tipo Carburante";
    case "PERIOD":
      return "Periodo";
    default:
      return level;
  }
}
