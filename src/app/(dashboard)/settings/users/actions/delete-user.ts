"use server";

import { ActionResult, ErrorCode } from "@/types/action-result";
import { userService } from "@/lib/services/user-service";
import { requireAuth, isTenantAdmin } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";

type DeleteUserResult = { id: string };

export async function deleteUser(
  userId: string
): Promise<ActionResult<DeleteUserResult>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  // Cannot deactivate yourself
  if (ctx.userId === userId) {
    return {
      success: false,
      error: "Non puoi disattivare il tuo stesso account",
      code: ErrorCode.FORBIDDEN,
    };
  }

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
    await userService.deactivateUser(userId, tenantId);
    return { success: true, data: { id: userId } };
  } catch (error) {
    logger.error({ error, userId: ctx.userId, targetUserId: userId }, "Failed to delete user");
    return {
      success: false,
      error: "Errore nella disattivazione dell'utente",
      code: ErrorCode.INTERNAL,
    };
  }
}
