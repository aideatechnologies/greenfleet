"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { FuelCardImportResult } from "@/lib/schemas/fuel-card-import";
import { requireAuth, isDriver } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

const BATCH_SIZE = 100;

type ImportRowInput = {
  cardNumber: string;
  supplierId: number;
  expiryDate: string | null; // ISO string
  assignedVehicleId: number | null;
  assignedEmployeeId: number | null;
  assignmentType: string;
};

export async function importFuelCardsAction(
  rows: ImportRowInput[]
): Promise<ActionResult<FuelCardImportResult>> {
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
      error: "Permessi insufficienti per importare carte carburante",
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
          await prisma.fuelCard.create({
            data: {
              tenantId: "", // Overwritten by tenant extension
              cardNumber: row.cardNumber,
              supplierId: row.supplierId,
              expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
              status: "ACTIVE",
              assignmentType: row.assignmentType,
              assignedVehicleId: row.assignedVehicleId,
              assignedEmployeeId: row.assignedEmployeeId,
            },
          });

          importedCount++;
        } catch (rowError) {
          skippedCount++;
          logger.debug(
            { error: rowError, row },
            "Skipped row during fuel card import"
          );
        }
      }
    }

    await auditCreate(prisma, {
      userId: ctx.userId,
      action: "fuel_card.created",
      entityType: "FuelCard",
      entityId: "BULK_IMPORT",
      data: {
        importedCount,
        skippedCount,
        totalRows: rows.length,
        source: "IMPORT_CSV",
      },
      source: "IMPORT_CSV",
    });

    revalidatePath("/fuel-cards");

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
      "Failed to import fuel cards"
    );
    return {
      success: false,
      error: "Errore durante l'importazione delle carte carburante",
      code: ErrorCode.INTERNAL,
    };
  }
}

/**
 * Server action to load lookups for fuel card import validation.
 */
export async function getFuelCardImportLookupsAction(): Promise<
  ActionResult<{
    existingCardNumbers: string[];
    vehicles: { id: number; licensePlate: string }[];
    employees: { id: number; name: string }[];
    suppliers: { id: number; name: string }[];
  }>
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

    const [fuelCards, vehicles, employees, suppliers] = await Promise.all([
      prisma.fuelCard.findMany({
        select: { cardNumber: true },
      }),
      prisma.tenantVehicle.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, licensePlate: true },
        orderBy: { licensePlate: "asc" },
      }),
      prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { lastName: "asc" },
      }),
      prisma.supplier.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      success: true,
      data: {
        existingCardNumbers: (
          fuelCards as unknown as { cardNumber: string }[]
        ).map((c) => c.cardNumber.toUpperCase()),
        vehicles: vehicles as unknown as { id: number; licensePlate: string }[],
        employees: (
          employees as unknown as {
            id: number;
            firstName: string;
            lastName: string;
          }[]
        ).map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
        })),
        suppliers: suppliers as unknown as { id: number; name: string }[],
      },
    };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento dei dati di riferimento",
      code: ErrorCode.INTERNAL,
    };
  }
}
