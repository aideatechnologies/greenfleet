import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";

import { getSessionContext } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getDocumentById } from "@/lib/services/vehicle-document-service";
import { getAbsoluteFilePath } from "@/lib/services/file-upload-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // 1. Authentication + RBAC via shared getSessionContext()
  const ctx = await getSessionContext();

  if (!ctx) {
    return new Response(
      JSON.stringify({ error: "Non autenticato" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const organizationId = ctx.organizationId;

  if (!organizationId) {
    return new Response(
      JSON.stringify({ error: "Nessun tenant attivo" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Get document (tenant-scoped)
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) {
    return new Response(
      JSON.stringify({ error: "ID documento non valido" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  const tenantPrisma = getPrismaForTenant(organizationId);
  const document = await getDocumentById(tenantPrisma, id);

  if (!document) {
    return new Response(
      JSON.stringify({ error: "Documento non trovato" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Read file from storage
  const filePath = getAbsoluteFilePath(document.fileUrl);

  try {
    const fileBuffer = await fs.readFile(filePath);

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": document.fileMimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.fileName)}"`,
        "Content-Length": String(document.fileSize),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "File non trovato nel filesystem" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
