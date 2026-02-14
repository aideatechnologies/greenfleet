"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { ImportSummary, ImportValidationResult } from "@/types/import";
import { employeeImportRowSchema } from "@/lib/schemas/employee-import";
import { requireAuth, isDriver } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

type ImportRowInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  fiscalCode?: string;
};

const BATCH_SIZE = 500;

export async function importEmployeesAction(
  rows: ImportRowInput[]
): Promise<ActionResult<ImportSummary>> {
  // Auth check
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

  // RBAC: not member/driver
  if (isDriver(ctx)) {
    return {
      success: false,
      error: "Permessi insufficienti per importare dipendenti",
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

  // Server-side validation of all rows
  const validRows: ImportRowInput[] = [];
  const errorResults: ImportValidationResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const parsed = employeeImportRowSchema.safeParse(row);

    if (parsed.success) {
      validRows.push({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email || undefined,
        phone: parsed.data.phone || undefined,
        fiscalCode: parsed.data.fiscalCode || undefined,
      });
    } else {
      errorResults.push({
        rowIndex: i,
        data: row as unknown as Record<string, string>,
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || "generale",
          message: issue.message,
        })),
        isValid: false,
      });
    }
  }

  if (validRows.length === 0) {
    return {
      success: true,
      data: {
        totalRows: rows.length,
        validRows: 0,
        errorRows: errorResults.length,
        importedRows: 0,
        skippedRows: rows.length,
        errors: errorResults,
      },
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);

    let importedCount = 0;
    let skippedCount = 0;

    // Insert in batches using createMany (SQL Server does not support skipDuplicates).
    // We handle duplicate fiscal codes by catching unique constraint errors per batch.
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);

      try {
        const result = await prisma.employee.createMany({
          data: batch.map((row) => ({
            tenantId: "", // Overwritten by tenant extension
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email || null,
            phone: row.phone || null,
            fiscalCode: row.fiscalCode || null,
          })),
        });

        importedCount += result.count;
      } catch (batchError) {
        // If batch fails (e.g. duplicate fiscal code), fall back to individual inserts
        logger.warn(
          { error: batchError, batchStart: i, batchSize: batch.length },
          "Batch insert failed, falling back to individual inserts"
        );

        for (const row of batch) {
          try {
            await prisma.employee.create({
              data: {
                tenantId: "", // Overwritten by tenant extension
                firstName: row.firstName,
                lastName: row.lastName,
                email: row.email || null,
                phone: row.phone || null,
                fiscalCode: row.fiscalCode || null,
              },
            });
            importedCount++;
          } catch (rowError) {
            // Skip duplicate / constraint violation rows
            skippedCount++;
            logger.debug(
              { error: rowError, row },
              "Skipped row during import (likely duplicate)"
            );
          }
        }
      }
    }

    revalidatePath("/dipendenti");

    return {
      success: true,
      data: {
        totalRows: rows.length,
        validRows: validRows.length,
        errorRows: errorResults.length,
        importedRows: importedCount,
        skippedRows: skippedCount + errorResults.length,
        errors: errorResults,
      },
    };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, tenantId, rowCount: validRows.length },
      "Failed to import employees"
    );
    return {
      success: false,
      error: "Errore durante l'importazione dei dipendenti",
      code: ErrorCode.INTERNAL,
    };
  }
}
