// ---------------------------------------------------------------------------
// PDF Export Service (Story 6.6)
// ---------------------------------------------------------------------------
// Generates a professional A4 PDF report using @react-pdf/renderer.
// Sections: Header, KPI Summary, Aggregation Table, Vehicle Detail,
// Methodology, and a footer on each page.
// ---------------------------------------------------------------------------

import ReactPDF, {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import React from "react";
import type { ReportExportData } from "@/types/report";

// ---------------------------------------------------------------------------
// Colors & Styles
// ---------------------------------------------------------------------------

const TEAL = "#0d9488";
const TEAL_LIGHT = "#ccfbf1";
const GRAY_50 = "#f9fafb";
const GRAY_200 = "#e5e7eb";
const GRAY_600 = "#4b5563";
const GRAY_900 = "#111827";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: GRAY_900,
  },
  // Header
  header: {
    backgroundColor: TEAL,
    padding: 16,
    marginBottom: 20,
    marginTop: -10,
    marginHorizontal: -10,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#d1fae5",
  },
  // KPI section
  kpiRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: GRAY_50,
    borderWidth: 1,
    borderColor: GRAY_200,
    borderRadius: 4,
    padding: 10,
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 7,
    color: GRAY_600,
    marginBottom: 4,
    textAlign: "center",
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  kpiUnit: {
    fontSize: 7,
    color: GRAY_600,
    marginTop: 2,
  },
  // Section titles
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: TEAL,
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: TEAL_LIGHT,
    paddingBottom: 4,
  },
  // Table
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: TEAL,
    borderRadius: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  tableHeaderCellLeft: {
    color: "#ffffff",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "left",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_200,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_200,
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: GRAY_50,
  },
  tableTotalsRow: {
    flexDirection: "row",
    backgroundColor: TEAL_LIGHT,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  tableCell: {
    fontSize: 8,
    textAlign: "right",
  },
  tableCellLeft: {
    fontSize: 8,
    textAlign: "left",
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  tableCellBoldLeft: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "left",
  },
  // Methodology
  methodologyText: {
    fontSize: 8,
    color: GRAY_600,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  methodologyLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GRAY_600,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: GRAY_200,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: GRAY_600,
  },
  footerPage: {
    fontSize: 7,
    color: GRAY_600,
  },
});

// ---------------------------------------------------------------------------
// Column width definitions
// ---------------------------------------------------------------------------

const AGG_COLUMNS = {
  label: { width: "25%", header: "Gruppo" },
  theoretical: { width: "13%", header: "Em. Teoriche" },
  real: { width: "13%", header: "Em. Reali" },
  delta: { width: "11%", header: "Delta" },
  deltaPct: { width: "10%", header: "Delta %" },
  km: { width: "11%", header: "Km" },
  fuel: { width: "10%", header: "Litri" },
  contribution: { width: "7%", header: "%" },
} as const;

const VEH_COLUMNS = {
  plate: { width: "12%", header: "Targa" },
  make: { width: "10%", header: "Marca" },
  model: { width: "14%", header: "Modello" },
  fuelType: { width: "10%", header: "Aliment." },
  km: { width: "10%", header: "Km" },
  theoretical: { width: "12%", header: "Em. Teor." },
  real: { width: "12%", header: "Em. Reali" },
  delta: { width: "10%", header: "Delta" },
  deltaPct: { width: "10%", header: "Delta %" },
} as const;

// ---------------------------------------------------------------------------
// PDF Document component
// ---------------------------------------------------------------------------

function ReportDocument({ data }: { data: ReportExportData }) {
  const fmtNum = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtSign = (n: number) => {
    const s = n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n > 0 ? `+${s}` : s;
  };

  const fmtDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  const totalReal = data.metadata.totalRealEmissions;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          Text,
          { style: styles.headerTitle },
          "Report Emissioni CO2"
        ),
        React.createElement(
          Text,
          { style: styles.headerSubtitle },
          `${data.tenantName} | Periodo: ${fmtDate(data.dateRange.startDate)} - ${fmtDate(data.dateRange.endDate)} | Generato: ${fmtDate(data.metadata.generatedAt)}`
        )
      ),

      // KPI Summary
      React.createElement(
        View,
        { style: styles.kpiRow },
        // Theoretical
        React.createElement(
          View,
          { style: styles.kpiBox },
          React.createElement(Text, { style: styles.kpiLabel }, "Emissioni Teoriche"),
          React.createElement(
            Text,
            { style: styles.kpiValue },
            fmtNum(data.metadata.totalTheoreticalEmissions)
          ),
          React.createElement(Text, { style: styles.kpiUnit }, "kgCO2e")
        ),
        // Real
        React.createElement(
          View,
          { style: styles.kpiBox },
          React.createElement(Text, { style: styles.kpiLabel }, "Emissioni Reali"),
          React.createElement(
            Text,
            { style: styles.kpiValue },
            fmtNum(data.metadata.totalRealEmissions)
          ),
          React.createElement(Text, { style: styles.kpiUnit }, "kgCO2e")
        ),
        // Delta
        React.createElement(
          View,
          { style: styles.kpiBox },
          React.createElement(Text, { style: styles.kpiLabel }, "Delta"),
          React.createElement(
            Text,
            {
              style: {
                ...styles.kpiValue,
                color: data.metadata.totalDeltaAbsolute > 0 ? "#dc2626" : "#16a34a",
              },
            },
            `${fmtSign(data.metadata.totalDeltaAbsolute)} kgCO2e`
          ),
          React.createElement(
            Text,
            { style: styles.kpiUnit },
            `(${fmtSign(data.metadata.totalDeltaPercentage)}%)`
          )
        ),
        // Fleet info
        React.createElement(
          View,
          { style: styles.kpiBox },
          React.createElement(Text, { style: styles.kpiLabel }, "Flotta"),
          React.createElement(
            Text,
            { style: styles.kpiValue },
            String(data.metadata.vehicleCount)
          ),
          React.createElement(Text, { style: styles.kpiUnit }, "veicoli")
        )
      ),

      // Aggregation table
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        `Dati aggregati per ${getAggregationLabel(data.aggregationLevel)}`
      ),
      React.createElement(
        View,
        { style: styles.table },
        // Table header
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: { ...styles.tableHeaderCellLeft, width: AGG_COLUMNS.label.width } }, AGG_COLUMNS.label.header),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, width: AGG_COLUMNS.theoretical.width } }, AGG_COLUMNS.theoretical.header),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, width: AGG_COLUMNS.real.width } }, AGG_COLUMNS.real.header),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, width: AGG_COLUMNS.delta.width } }, AGG_COLUMNS.delta.header),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, width: AGG_COLUMNS.deltaPct.width } }, AGG_COLUMNS.deltaPct.header),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, width: AGG_COLUMNS.km.width } }, AGG_COLUMNS.km.header),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, width: AGG_COLUMNS.fuel.width } }, AGG_COLUMNS.fuel.header),
          React.createElement(Text, { style: { ...styles.tableHeaderCell, width: AGG_COLUMNS.contribution.width } }, AGG_COLUMNS.contribution.header)
        ),
        // Data rows
        ...data.aggregations.map((agg, idx) => {
          const contribution = totalReal === 0 ? 0 : Math.round(((agg.realEmissions / totalReal) * 100) * 100) / 100;
          return React.createElement(
            View,
            { key: agg.id, style: idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
            React.createElement(Text, { style: { ...styles.tableCellLeft, width: AGG_COLUMNS.label.width } }, agg.label),
            React.createElement(Text, { style: { ...styles.tableCell, width: AGG_COLUMNS.theoretical.width } }, fmtNum(agg.theoreticalEmissions)),
            React.createElement(Text, { style: { ...styles.tableCell, width: AGG_COLUMNS.real.width } }, fmtNum(agg.realEmissions)),
            React.createElement(Text, { style: { ...styles.tableCell, width: AGG_COLUMNS.delta.width } }, fmtSign(agg.deltaAbsolute)),
            React.createElement(Text, { style: { ...styles.tableCell, width: AGG_COLUMNS.deltaPct.width } }, `${fmtSign(agg.deltaPercentage)}%`),
            React.createElement(Text, { style: { ...styles.tableCell, width: AGG_COLUMNS.km.width } }, fmtNum(agg.totalKm)),
            React.createElement(Text, { style: { ...styles.tableCell, width: AGG_COLUMNS.fuel.width } }, fmtNum(agg.totalFuel)),
            React.createElement(Text, { style: { ...styles.tableCell, width: AGG_COLUMNS.contribution.width } }, `${fmtNum(contribution)}%`)
          );
        }),
        // Totals row
        React.createElement(
          View,
          { style: styles.tableTotalsRow },
          React.createElement(Text, { style: { ...styles.tableCellBoldLeft, width: AGG_COLUMNS.label.width } }, "TOTALE"),
          React.createElement(Text, { style: { ...styles.tableCellBold, width: AGG_COLUMNS.theoretical.width } }, fmtNum(data.metadata.totalTheoreticalEmissions)),
          React.createElement(Text, { style: { ...styles.tableCellBold, width: AGG_COLUMNS.real.width } }, fmtNum(data.metadata.totalRealEmissions)),
          React.createElement(Text, { style: { ...styles.tableCellBold, width: AGG_COLUMNS.delta.width } }, fmtSign(data.metadata.totalDeltaAbsolute)),
          React.createElement(Text, { style: { ...styles.tableCellBold, width: AGG_COLUMNS.deltaPct.width } }, `${fmtSign(data.metadata.totalDeltaPercentage)}%`),
          React.createElement(Text, { style: { ...styles.tableCellBold, width: AGG_COLUMNS.km.width } }, fmtNum(data.metadata.totalKm)),
          React.createElement(Text, { style: { ...styles.tableCellBold, width: AGG_COLUMNS.fuel.width } }, fmtNum(data.metadata.totalFuel)),
          React.createElement(Text, { style: { ...styles.tableCellBold, width: AGG_COLUMNS.contribution.width } }, "100%")
        )
      ),

      // Vehicle detail table (optional, with page break if needed)
      ...(data.vehicleDetails && data.vehicleDetails.length > 0
        ? [
            React.createElement(
              Text,
              { key: "veh-title", style: styles.sectionTitle, break: data.aggregations.length > 15 },
              "Dettaglio per Veicolo"
            ),
            React.createElement(
              View,
              { key: "veh-table", style: styles.table },
              // Vehicle table header
              React.createElement(
                View,
                { style: styles.tableHeader },
                React.createElement(Text, { style: { ...styles.tableHeaderCellLeft, width: VEH_COLUMNS.plate.width } }, VEH_COLUMNS.plate.header),
                React.createElement(Text, { style: { ...styles.tableHeaderCellLeft, width: VEH_COLUMNS.make.width } }, VEH_COLUMNS.make.header),
                React.createElement(Text, { style: { ...styles.tableHeaderCellLeft, width: VEH_COLUMNS.model.width } }, VEH_COLUMNS.model.header),
                React.createElement(Text, { style: { ...styles.tableHeaderCellLeft, width: VEH_COLUMNS.fuelType.width } }, VEH_COLUMNS.fuelType.header),
                React.createElement(Text, { style: { ...styles.tableHeaderCell, width: VEH_COLUMNS.km.width } }, VEH_COLUMNS.km.header),
                React.createElement(Text, { style: { ...styles.tableHeaderCell, width: VEH_COLUMNS.theoretical.width } }, VEH_COLUMNS.theoretical.header),
                React.createElement(Text, { style: { ...styles.tableHeaderCell, width: VEH_COLUMNS.real.width } }, VEH_COLUMNS.real.header),
                React.createElement(Text, { style: { ...styles.tableHeaderCell, width: VEH_COLUMNS.delta.width } }, VEH_COLUMNS.delta.header),
                React.createElement(Text, { style: { ...styles.tableHeaderCell, width: VEH_COLUMNS.deltaPct.width } }, VEH_COLUMNS.deltaPct.header)
              ),
              // Vehicle rows
              ...data.vehicleDetails.map((v, idx) =>
                React.createElement(
                  View,
                  { key: v.plate, style: idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt, wrap: false },
                  React.createElement(Text, { style: { ...styles.tableCellLeft, width: VEH_COLUMNS.plate.width, fontFamily: "Helvetica-Bold" } }, v.plate),
                  React.createElement(Text, { style: { ...styles.tableCellLeft, width: VEH_COLUMNS.make.width } }, v.make),
                  React.createElement(Text, { style: { ...styles.tableCellLeft, width: VEH_COLUMNS.model.width } }, v.model),
                  React.createElement(Text, { style: { ...styles.tableCellLeft, width: VEH_COLUMNS.fuelType.width } }, v.fuelType),
                  React.createElement(Text, { style: { ...styles.tableCell, width: VEH_COLUMNS.km.width } }, fmtNum(v.km)),
                  React.createElement(Text, { style: { ...styles.tableCell, width: VEH_COLUMNS.theoretical.width } }, fmtNum(v.theoreticalEmissions)),
                  React.createElement(Text, { style: { ...styles.tableCell, width: VEH_COLUMNS.real.width } }, fmtNum(v.realEmissions)),
                  React.createElement(Text, { style: { ...styles.tableCell, width: VEH_COLUMNS.delta.width } }, fmtSign(v.delta)),
                  React.createElement(Text, { style: { ...styles.tableCell, width: VEH_COLUMNS.deltaPct.width } }, `${fmtSign(v.deltaPercentage)}%`)
                )
              )
            ),
          ]
        : []),

      // Methodology section
      ...(data.methodology.technicalDataSource
        ? [
            React.createElement(
              Text,
              { key: "meth-title", style: styles.sectionTitle },
              "Metodologia"
            ),
            React.createElement(
              View,
              { key: "meth-content" },
              React.createElement(
                Text,
                { style: styles.methodologyText },
                React.createElement(Text, { style: styles.methodologyLabel }, "Fonte dati tecnici: "),
                data.methodology.technicalDataSource
              ),
              React.createElement(
                Text,
                { style: styles.methodologyText },
                React.createElement(Text, { style: styles.methodologyLabel }, "Formula emissioni teoriche: "),
                data.methodology.theoreticalFormula
              ),
              React.createElement(
                Text,
                { style: styles.methodologyText },
                React.createElement(Text, { style: styles.methodologyLabel }, "Formula emissioni reali: "),
                data.methodology.realFormula
              ),
              React.createElement(
                Text,
                { style: styles.methodologyText },
                React.createElement(Text, { style: styles.methodologyLabel }, "Fonte fattori di emissione: "),
                data.methodology.emissionFactorSource
              ),
              React.createElement(
                Text,
                { style: styles.methodologyText },
                React.createElement(Text, { style: styles.methodologyLabel }, "Periodo: "),
                data.methodology.period
              ),
              React.createElement(
                Text,
                { style: styles.methodologyText },
                React.createElement(Text, { style: styles.methodologyLabel }, "Perimetro: "),
                data.methodology.perimeter
              ),
              ...(data.methodology.emissionFactors.length > 0
                ? [
                    React.createElement(
                      Text,
                      { key: "ef-title", style: { ...styles.methodologyText, marginTop: 4 } },
                      React.createElement(Text, { style: styles.methodologyLabel }, "Fattori di emissione:")
                    ),
                    ...data.methodology.emissionFactors.map((ef) =>
                      React.createElement(
                        Text,
                        { key: ef.fuelType, style: { ...styles.methodologyText, paddingLeft: 12 } },
                        `${ef.fuelType}: ${ef.value.toLocaleString("it-IT", { minimumFractionDigits: 4 })} ${ef.unit}`
                      )
                    ),
                  ]
                : [])
            ),
          ]
        : []),

      // Footer (fixed position on each page)
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(
          Text,
          { style: styles.footerText },
          `Greenfleet - ${data.tenantName} - Report Emissioni CO2`
        ),
        React.createElement(
          Text,
          { style: styles.footerPage, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Pagina ${pageNumber} di ${totalPages}` }
        )
      )
    )
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a PDF buffer from ReportExportData.
 * Returns a Node.js Buffer that can be sent as a Response.
 */
export async function generatePDF(
  data: ReportExportData
): Promise<Buffer> {
  const doc = React.createElement(ReportDocument, { data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await ReactPDF.renderToStream(doc as any);

  // Collect stream chunks into a buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
