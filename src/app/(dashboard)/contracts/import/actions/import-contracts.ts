"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { ContractImportResult } from "@/lib/schemas/contract-import";
import { requireAuth, isDriver } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { auditCreate } from "@/lib/services/audit-service";
import { logger } from "@/lib/utils/logger";

const BATCH_SIZE = 100;

type ImportRowInput = {
  contractNumber: string;
  vehicleId: number;
  licensePlate: string;
  contractType: string;
  supplierId: number | null;
  supplierName: string | null;
  startDate: string; // ISO string
  endDate: string | null; // ISO string
  monthlyRate: number | null;
  franchiseKm: number | null;
};

export async function importContractsAction(
  rows: ImportRowInput[]
): Promise<ActionResult<ContractImportResult>> {
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
      error: "Permessi insufficienti per importare contratti",
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
          await prisma.contract.create({
            data: {
              tenantId: "", // Overwritten by tenant extension
              vehicleId: row.vehicleId,
              contractNumber: row.contractNumber,
              type: row.contractType,
              status: "ACTIVE",
              supplierId: row.supplierId,
              supplier: row.supplierName,
              startDate: new Date(row.startDate),
              endDate: row.endDate ? new Date(row.endDate) : null,
              monthlyRate: row.monthlyRate,
              franchiseKm: row.franchiseKm,
            },
          });

          importedCount++;
        } catch (rowError) {
          skippedCount++;
          logger.debug(
            { error: rowError, row },
            "Skipped row during contract import"
          );
        }
      }
    }

    await auditCreate(prisma, {
      userId: ctx.userId,
      action: "contract.created",
      entityType: "Contract",
      entityId: "BULK_IMPORT",
      data: {
        importedCount,
        skippedCount,
        totalRows: rows.length,
        source: "IMPORT_CSV",
      },
      source: "IMPORT_CSV",
    });

    revalidatePath("/contracts");

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
      "Failed to import contracts"
    );
    return {
      success: false,
      error: "Errore durante l'importazione dei contratti",
      code: ErrorCode.INTERNAL,
    };
  }
}

/**
 * Server action to load vehicle plates and suppliers for import validation.
 */
export async function getContractImportLookupsAction(): Promise<
  ActionResult<{
    vehicles: { id: number; licensePlate: string }[];
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

    const [vehicles, suppliers] = await Promise.all([
      prisma.tenantVehicle.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, licensePlate: true },
        orderBy: { licensePlate: "asc" },
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
        vehicles: vehicles as unknown as { id: number; licensePlate: string }[],
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
