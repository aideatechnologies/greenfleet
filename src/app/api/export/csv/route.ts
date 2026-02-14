// ---------------------------------------------------------------------------
// GET /api/export/csv — CSV Export Route Handler (Story 6.6)
// ---------------------------------------------------------------------------

import { getSessionContext } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { exportParamsSchema } from "@/lib/schemas/export";
import { buildExportData } from "@/lib/services/export-data-service";
import {
  generateCSV,
  generateCSVStream,
} from "@/lib/services/csv-export-service";
import { generateExportFilename } from "@/lib/utils/filename";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  // 1. Authentication + RBAC via shared getSessionContext()
  const ctx = await getSessionContext();

  if (!ctx) {
    return new Response(
      JSON.stringify({ error: "Non autenticato" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const organizationId = ctx.organizationId;

  if (!organizationId) {
    return new Response(
      JSON.stringify({ error: "Nessun tenant attivo" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. RBAC: only owner/admin can export
  if (ctx.role === "member") {
    return new Response(
      JSON.stringify({ error: "Permessi insufficienti per esportare report" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Parse query params
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = exportParamsSchema.safeParse({
    ...searchParams,
    format: "csv",
  });

  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Parametri non validi",
        details: parsed.error.issues,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const params = parsed.data;

  try {
    // 4. Build export data
    const tenantPrisma = getPrismaForTenant(organizationId);
    const exportData = await buildExportData(tenantPrisma, {
      organizationId,
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      aggregationLevel: params.aggregationLevel,
      includeVehicleDetail: params.includeVehicleDetail,
      includeMethodology: params.includeMethodology,
      carlistId: params.carlistId,
    });

    // 5. Generate filename
    const filename = generateExportFilename({
      tenantName: exportData.tenantName,
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      format: "csv",
    });

    // 6. Check if we need streaming (>1000 rows)
    const totalRows =
      exportData.aggregations.length +
      (exportData.vehicleDetails?.length ?? 0);

    const responseHeaders = {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "no-store",
    };

    if (totalRows > 1000) {
      // Use streaming for large datasets
      const stream = generateCSVStream(exportData, {
        separator: params.csvSeparator,
        decimalSeparator: params.csvSeparator === "," ? "." : ",",
      });

      return new Response(stream, {
        status: 200,
        headers: responseHeaders,
      });
    }

    // 7. Generate CSV (non-streaming)
    const csvContent = generateCSV(exportData, {
      separator: params.csvSeparator,
      decimalSeparator: params.csvSeparator === "," ? "." : ",",
    });

    return new Response(csvContent, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[CSV Export] Error:", error);
    return new Response(
      JSON.stringify({ error: "Errore durante la generazione del CSV" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
