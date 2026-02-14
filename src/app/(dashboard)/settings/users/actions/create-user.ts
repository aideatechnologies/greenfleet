"use server";

import { ActionResult, ErrorCode } from "@/types/action-result";
import { createUserSchema } from "@/lib/schemas/user";
import { userService } from "@/lib/services/user-service";
import { requireAuth, isGlobalAdmin, isTenantAdmin } from "@/lib/auth/permissions";
import { logger } from "@/lib/utils/logger";

type CreateUserResult = { id: string; name: string; email: string; role: string };

export async function createUser(
  formData: FormData
): Promise<ActionResult<CreateUserResult>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    tenantId: formData.get("tenantId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: ErrorCode.VALIDATION,
    };
  }

  const { tenantId, role } = parsed.data;

  // RBAC: must be admin of the target tenant
  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    return {
      success: false,
      error: "Permessi insufficienti per questo tenant",
      code: ErrorCode.FORBIDDEN,
    };
  }

  // Only admin or owner can create admin users
  if (role === "admin") {
    const callerIsAdmin = await isTenantAdmin(ctx, tenantId);
    if (!callerIsAdmin) {
      return {
        success: false,
        error: "Permessi insufficienti per creare un Fleet Manager",
        code: ErrorCode.FORBIDDEN,
      };
    }
  }

  try {
    const user = await userService.createUser(parsed.data);
    return { success: true, data: user };
  } catch (error) {
    if (error instanceof Error && error.message === "SIGNUP_FAILED") {
      return {
        success: false,
        error: "Errore nella creazione dell'utente (email già in uso?)",
        code: ErrorCode.CONFLICT,
      };
    }
    logger.error({ error, userId: ctx.userId }, "Failed to create user");
    return {
      success: false,
      error: "Errore nella creazione dell'utente",
      code: ErrorCode.INTERNAL,
    };
  }
}
