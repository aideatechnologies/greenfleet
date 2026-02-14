"use server";

import { ActionResult, ErrorCode } from "@/types/action-result";
import { updateUserSchema } from "@/lib/schemas/user";
import { userService } from "@/lib/services/user-service";
import { requireAuth, isGlobalAdmin, isTenantAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

type UpdateUserResult = { id: string };

export async function updateUser(
  userId: string,
  formData: FormData
): Promise<ActionResult<UpdateUserResult>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  // tenantId from session, never from client (architecture anti-pattern)
  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti",
      code: ErrorCode.FORBIDDEN,
    };
  }

  const nameValue = formData.get("name");
  const emailValue = formData.get("email");
  const roleValue = formData.get("role");

  const parsed = updateUserSchema.safeParse({
    name:
      typeof nameValue === "string" && nameValue.trim()
        ? nameValue.trim()
        : undefined,
    email:
      typeof emailValue === "string" && emailValue.trim()
        ? emailValue.trim()
        : undefined,
    role:
      typeof roleValue === "string" && roleValue.trim()
        ? roleValue.trim()
        : undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  // FM cannot promote to admin role
  if (parsed.data.role === "admin" && !(await isGlobalAdmin(ctx.userId))) {
    return {
      success: false,
      error: "Solo il Platform Admin puo assegnare il ruolo Fleet Manager",
      code: ErrorCode.FORBIDDEN,
    };
  }

  // Verify user belongs to the tenant
  const member = await prisma.member.findFirst({
    where: { userId, organizationId: tenantId },
  });
  if (!member) {
    return {
      success: false,
      error: "Utente non trovato nel tenant",
      code: ErrorCode.NOT_FOUND,
    };
  }

  try {
    const result = await userService.updateUser(userId, tenantId, parsed.data);
    return { success: true, data: result };
  } catch (error) {
    logger.error({ error, userId: ctx.userId, targetUserId: userId }, "Failed to update user");
    return {
      success: false,
      error: "Errore nell'aggiornamento dell'utente",
      code: ErrorCode.INTERNAL,
    };
  }
}
