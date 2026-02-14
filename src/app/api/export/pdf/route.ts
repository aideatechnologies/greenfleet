// ---------------------------------------------------------------------------
// GET /api/export/pdf — PDF Export Route Handler (Story 6.6)
// ---------------------------------------------------------------------------

import { getSessionContext } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { exportParamsSchema } from "@/lib/schemas/export";
import { buildExportData } from "@/lib/services/export-data-service";
import { generatePDF } from "@/lib/services/pdf-export-service";
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
    format: "pdf",
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

    // 5. Generate PDF
    const pdfBuffer = await generatePDF(exportData);

    // 6. Generate filename
    const filename = generateExportFilename({
      tenantName: exportData.tenantName,
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
      format: "pdf",
    });

    // 7. Return PDF response
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[PDF Export] Error:", error);
    return new Response(
      JSON.stringify({ error: "Errore durante la generazione del PDF" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
