"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { KmReadingImportResult } from "@/lib/schemas/km-reading-import";
import { requireAuth, isDriver } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

const BATCH_SIZE = 500;

type ImportRowInput = {
  vehicleId: number;
  licensePlate: string;
  date: string; // ISO string
  odometerKm: number;
  source: string;
};

export async function importKmReadingsAction(
  rows: ImportRowInput[]
): Promise<ActionResult<KmReadingImportResult>> {
  const startTime = Date.now();

  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  if (isDriver(ctx)) {
    return {
      success: false,
      error: "Permessi insufficienti per importare rilevazioni km",
      code: ErrorCode.FORBIDDEN,
    };
  }

  if (!rows || rows.length === 0) {
    return {
      success: false,
      error: "Nessuna riga da importare",
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);

    let importedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      try {
        const result = await prisma.kmReading.createMany({
          data: batch.map((row) => ({
            tenantId: "", // Overwritten by tenant extension
            vehicleId: row.vehicleId,
            userId: ctx.userId,
            date: new Date(row.date),
            odometerKm: row.odometerKm,
            source: row.source,
          })),
        });

        importedCount += result.count;
      } catch (batchError) {
        logger.warn(
          { error: batchError, batchStart: i, batchSize: batch.length },
          "Batch insert failed, falling back to individual inserts"
        );

        for (const row of batch) {
          try {
            await prisma.kmReading.create({
              data: {
                tenantId: "", // Overwritten by tenant extension
                vehicleId: row.vehicleId,
                userId: ctx.userId,
                date: new Date(row.date),
                odometerKm: row.odometerKm,
                source: row.source,
              },
            });
            importedCount++;
          } catch (rowError) {
            skippedCount++;
            logger.debug(
              { error: rowError, row },
              "Skipped row during km reading import"
            );
          }
        }
      }
    }

    await auditCreate(prisma, {
      userId: ctx.userId,
      action: "km_reading.created",
      entityType: "KmReading",
      entityId: "BULK_IMPORT",
      data: {
        importedCount,
        skippedCount,
        totalRows: rows.length,
        source: "IMPORT_CSV",
      },
      source: "IMPORT_CSV",
    });

    revalidatePath("/km-readings");

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      data: {
        totalRows: rows.length,
        validRows: rows.length,
        errorRows: 0,
        importedRows: importedCount,
        skippedRows: skippedCount,
        durationMs,
        errors: [],
      },
    };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, rowCount: rows.length },
      "Failed to import km readings"
    );
    return {
      success: false,
      error: "Errore durante l'importazione delle rilevazioni km",
      code: ErrorCode.INTERNAL,
    };
  }
}

/**
 * Server action to load vehicle plates for km reading import validation.
 */
export async function getKmReadingImportLookupsAction(): Promise<
  ActionResult<{ id: number; licensePlate: string }[]>
> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  if (isDriver(ctx)) {
    return {
      success: false,
      error: "Permessi insufficienti",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);

    const vehicles = await prisma.tenantVehicle.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, licensePlate: true },
      orderBy: { licensePlate: "asc" },
    });

    return {
      success: true,
      data: vehicles as unknown as { id: number; licensePlate: string }[],
    };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento dei veicoli",
      code: ErrorCode.INTERNAL,
    };
  }
}
