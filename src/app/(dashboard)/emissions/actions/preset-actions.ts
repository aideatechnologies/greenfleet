"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import type { ReportFilterPreset } from "@/types/report";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import {
  getPresets,
  createPreset,
  deletePreset,
} from "@/lib/services/report-preset-service";

// ---------------------------------------------------------------------------
// Get all presets
// ---------------------------------------------------------------------------

export async function getPresetsAction(): Promise<
  ActionResult<ReportFilterPreset[]>
> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return { success: false, error: "Nessun tenant attivo", code: ErrorCode.FORBIDDEN };
  }

  const prisma = getPrismaForTenant(tenantId);
  const presets = await getPresets(prisma, tenantId);
  return { success: true, data: presets };
}

// ---------------------------------------------------------------------------
// Save a preset (create)
// ---------------------------------------------------------------------------

export async function savePresetAction(
  name: string,
  filters: ReportFilterPreset["filters"]
): Promise<ActionResult<ReportFilterPreset>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  if (ctx.role !== "owner" && ctx.role !== "admin" && ctx.role !== "mobility_manager") {
    return {
      success: false,
      error: "Non hai i permessi per salvare preset",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return { success: false, error: "Nessun tenant attivo", code: ErrorCode.FORBIDDEN };
  }

  if (!name.trim()) {
    return {
      success: false,
      error: "Il nome del preset e obbligatorio",
      code: ErrorCode.VALIDATION,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    const preset = await createPreset(prisma, tenantId, ctx.userId, name.trim(), filters);
    return { success: true, data: preset };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Unique constraint")) {
      return {
        success: false,
        error: `Esiste gia un preset con il nome "${name}"`,
        code: ErrorCode.CONFLICT,
      };
    }
    return {
      success: false,
      error: "Errore nel salvataggio del preset",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Delete a preset
// ---------------------------------------------------------------------------

export async function deletePresetAction(
  presetId: number
): Promise<ActionResult<null>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  if (ctx.role !== "owner" && ctx.role !== "admin" && ctx.role !== "mobility_manager") {
    return {
      success: false,
      error: "Non hai i permessi per eliminare preset",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return { success: false, error: "Nessun tenant attivo", code: ErrorCode.FORBIDDEN };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);
    await deletePreset(prisma, presetId);
    return { success: true, data: null };
  } catch {
    return {
      success: false,
      error: "Errore nell'eliminazione del preset",
      code: ErrorCode.INTERNAL,
    };
  }
}
