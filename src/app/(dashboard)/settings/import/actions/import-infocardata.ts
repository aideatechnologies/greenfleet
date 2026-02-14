"use server";

import { requireAuth, isGlobalAdmin } from "@/lib/auth/permissions";
import { ErrorCode, type ActionResult } from "@/types/action-result";
import type { ImportProgress } from "@/lib/integrations/infocardata/types";
import {
  runBatchImport,
  runIncrementalImport,
} from "@/lib/services/catalog-import-service";
import { checkHealth } from "@/lib/integrations/infocardata/client";
import {
  isInfocarSqlConfigured,
  countVehicles as countInfocarVehicles,
} from "@/lib/integrations/infocar-sql/client";
import { logger } from "@/lib/utils/logger";

// ---------------------------------------------------------------------------
// Import batch completo
// ---------------------------------------------------------------------------

/**
 * Server Action: esegue un import batch completo da InfocarData.
 * Richiede autenticazione e ruolo Global Admin (owner).
 */
export async function importInfocarDataBatch(): Promise<
  ActionResult<ImportProgress>
> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  const isAdmin = await isGlobalAdmin(authResult.ctx.userId);
  if (!isAdmin) {
    return {
      success: false,
      error: "Solo l'Admin di piattaforma puo eseguire l'import",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    logger.info(
      { userId: authResult.ctx.userId },
      "Avvio import batch InfocarData (server action)"
    );

    const progress = await runBatchImport();

    if (progress.status === "failed") {
      logger.warn(
        { progress },
        "Import batch completato con stato 'failed'"
      );
      return {
        success: false,
        error:
          progress.errors[0]?.message ??
          "Errore durante l'import batch",
        code: ErrorCode.INTERNAL,
      };
    }

    logger.info(
      {
        userId: authResult.ctx.userId,
        created: progress.createdRecords,
        updated: progress.updatedRecords,
        skipped: progress.skippedRecords,
        errors: progress.errors.length,
      },
      "Import batch InfocarData completato (server action)"
    );

    return { success: true, data: progress };
  } catch (error) {
    logger.error(
      { error, userId: authResult.ctx.userId },
      "Import batch InfocarData fallito (server action)"
    );
    return {
      success: false,
      error: "Errore imprevisto durante l'import batch",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Import incrementale
// ---------------------------------------------------------------------------

/**
 * Server Action: esegue un import incrementale da InfocarData.
 * Recupera solo i veicoli modificati dopo l'ultima sincronizzazione.
 * Richiede autenticazione e ruolo Global Admin (owner).
 */
export async function importInfocarDataIncremental(): Promise<
  ActionResult<ImportProgress>
> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  const isAdmin = await isGlobalAdmin(authResult.ctx.userId);
  if (!isAdmin) {
    return {
      success: false,
      error: "Solo l'Admin di piattaforma puo eseguire l'import",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    logger.info(
      { userId: authResult.ctx.userId },
      "Avvio import incrementale InfocarData (server action)"
    );

    const progress = await runIncrementalImport();

    if (progress.status === "failed") {
      logger.warn(
        { progress },
        "Import incrementale completato con stato 'failed'"
      );
      return {
        success: false,
        error:
          progress.errors[0]?.message ??
          "Errore durante l'import incrementale",
        code: ErrorCode.INTERNAL,
      };
    }

    logger.info(
      {
        userId: authResult.ctx.userId,
        created: progress.createdRecords,
        updated: progress.updatedRecords,
        skipped: progress.skippedRecords,
        errors: progress.errors.length,
      },
      "Import incrementale InfocarData completato (server action)"
    );

    return { success: true, data: progress };
  } catch (error) {
    logger.error(
      { error, userId: authResult.ctx.userId },
      "Import incrementale InfocarData fallito (server action)"
    );
    return {
      success: false,
      error: "Errore imprevisto durante l'import incrementale",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/**
 * Server Action: verifica lo stato di connessione al servizio InfocarData.
 * Richiede autenticazione e ruolo Global Admin (owner).
 */
export async function checkInfocarDataHealth(): Promise<
  ActionResult<{
    available: boolean;
    message: string;
  }>
> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  const isAdmin = await isGlobalAdmin(authResult.ctx.userId);
  if (!isAdmin) {
    return {
      success: false,
      error: "Solo l'Admin di piattaforma puo verificare lo stato",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    // Prova prima connessione SQL diretta
    if (isInfocarSqlConfigured()) {
      try {
        const total = await countInfocarVehicles();
        return {
          success: true,
          data: {
            available: true,
            message: `Connessione SQL diretta attiva. ${total} veicoli nel database InfoCar.`,
          },
        };
      } catch (sqlError) {
        logger.warn(
          { error: sqlError },
          "Health check SQL diretto fallito, provo HTTP"
        );
      }
    }

    // Fallback: HTTP API
    const health = await checkHealth();

    return {
      success: true,
      data: {
        available: health.available,
        message: health.message,
      },
    };
  } catch (error) {
    logger.error({ error }, "Health check InfocarData fallito");
    return {
      success: false,
      error: "Errore durante la verifica dello stato InfocarData",
      code: ErrorCode.INTERNAL,
    };
  }
}
