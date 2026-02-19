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

  // RBAC: role-based creation hierarchy
  const callerIsOwner = await isGlobalAdmin(ctx.userId);
  const callerRole = ctx.role;

  if (callerIsOwner) {
    // owner can create any role (admin, mobility_manager, member)
  } else if (callerRole === "admin") {
    // admin can create mobility_manager and member, but NOT admin
    if (role === "admin") {
      return {
        success: false,
        error: "Un Fleet Manager non puo creare altri Fleet Manager",
        code: ErrorCode.FORBIDDEN,
      };
    }
  } else {
    // mobility_manager, member, etc. cannot create users
    return {
      success: false,
      error: "Permessi insufficienti per creare utenti",
      code: ErrorCode.FORBIDDEN,
    };
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
