"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { VehicleImportResult } from "@/lib/schemas/vehicle-import";
import { requireAuth, isDriver } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { prisma as globalPrisma } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

const BATCH_SIZE = 100;

type ImportRowInput = {
  licensePlate: string;
  marca: string;
  modello: string;
  allestimento: string | null;
  vin: string | null;
  registrationDate: string; // ISO string
  fuelType: string;
  status: string;
};

export async function importVehiclesAction(
  rows: ImportRowInput[]
): Promise<ActionResult<VehicleImportResult>> {
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
      error: "Permessi insufficienti per importare veicoli",
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

      for (const row of batch) {
        try {
          // 1. Look up or create CatalogVehicle by marca + modello + allestimento
          let catalogVehicle = await globalPrisma.catalogVehicle.findFirst({
            where: {
              marca: row.marca,
              modello: row.modello,
              allestimento: row.allestimento,
            },
          });

          if (!catalogVehicle) {
            catalogVehicle = await globalPrisma.catalogVehicle.create({
              data: {
                marca: row.marca,
                modello: row.modello,
                allestimento: row.allestimento,
                source: "IMPORT_CSV",
              },
            });
          }

          const catalogVehicleId = Number(catalogVehicle.id);

          // 2. Look up or create Engine by catalogVehicleId + fuelType
          const existingEngine = await globalPrisma.engine.findFirst({
            where: {
              catalogVehicleId: catalogVehicle.id,
              fuelType: row.fuelType,
            },
          });

          if (!existingEngine) {
            await globalPrisma.engine.create({
              data: {
                catalogVehicleId: catalogVehicle.id,
                fuelType: row.fuelType,
              },
            });
          }

          // 3. Create TenantVehicle
          await prisma.tenantVehicle.create({
            data: {
              tenantId: "", // Overwritten by tenant extension
              catalogVehicleId: catalogVehicleId,
              licensePlate: row.licensePlate,
              registrationDate: new Date(row.registrationDate),
              status: row.status,
              vin: row.vin,
            },
          });

          importedCount++;
        } catch (rowError) {
          skippedCount++;
          logger.debug(
            { error: rowError, row },
            "Skipped row during vehicle import"
          );
        }
      }
    }

    await auditCreate(prisma, {
      userId: ctx.userId,
      action: "vehicle.created",
      entityType: "Vehicle",
      entityId: "BULK_IMPORT",
      data: {
        importedCount,
        skippedCount,
        totalRows: rows.length,
        source: "IMPORT_CSV",
      },
      source: "IMPORT_CSV",
    });

    revalidatePath("/vehicles");

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
      "Failed to import vehicles"
    );
    return {
      success: false,
      error: "Errore durante l'importazione dei veicoli",
      code: ErrorCode.INTERNAL,
    };
  }
}

/**
 * Server action to load existing vehicle plates for duplicate detection.
 */
export async function getTenantVehiclePlatesForImportAction(): Promise<
  ActionResult<{ licensePlate: string }[]>
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
      select: { licensePlate: true },
    });

    return {
      success: true,
      data: vehicles as unknown as { licensePlate: string }[],
    };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento dei veicoli",
      code: ErrorCode.INTERNAL,
    };
  }
}
