import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { headers } from "next/headers";
import { ErrorCode } from "@/types/action-result";

// Greenfleet role mapping to Better Auth organization roles:
// owner  = Platform Admin (cross-tenant)
// admin  = Fleet Manager (single-tenant admin)
// member = Driver (read-only + own fuel/km)

export type GreenfleetRole = "owner" | "admin" | "member";

export type SessionContext = {
  userId: string;
  role: GreenfleetRole | null;
  organizationId: string | null;
};

export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const sessionData = session.session as Record<string, unknown>;
  let organizationId =
    typeof sessionData.activeOrganizationId === "string"
      ? sessionData.activeOrganizationId
      : null;

  let role: GreenfleetRole | null = null;

  if (organizationId) {
    const membership = await prisma.member.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId,
        },
      },
      select: { role: true },
    });
    role = (membership?.role as GreenfleetRole) ?? null;

    // Admin impersonating an org where they're not a direct member:
    // grant virtual "owner" role so all permission checks pass.
    if (!role && (await isGlobalAdmin(session.user.id))) {
      role = "owner";
    }
  } else {
    // Fallback: look up the user's first membership if activeOrganizationId is missing
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: { role: true, organizationId: true },
    });
    if (membership) {
      organizationId = membership.organizationId;
      role = (membership.role as GreenfleetRole) ?? null;
    }
  }

  return {
    userId: session.user.id,
    role,
    organizationId,
  };
}

/** Check if user is platform admin (owner in any org) */
export async function isGlobalAdmin(userId: string): Promise<boolean> {
  const ownerMembership = await prisma.member.findFirst({
    where: {
      userId,
      role: "owner",
    },
  });
  return !!ownerMembership;
}

/** Check if user has specific role in their active org */
export function hasRole(
  ctx: SessionContext,
  role: GreenfleetRole
): boolean {
  return ctx.role === role;
}

/** Check if user can access the given tenant (owner bypasses) */
export async function canAccess(
  ctx: SessionContext,
  tenantId: string
): Promise<boolean> {
  // Platform admin (owner) can access any tenant
  if (await isGlobalAdmin(ctx.userId)) return true;

  // Others can only access their own tenant
  return ctx.organizationId === tenantId;
}

/** Check if user is admin of the given tenant (owner or admin in the org) */
export async function isTenantAdmin(
  ctx: SessionContext,
  tenantId: string
): Promise<boolean> {
  // Platform admin can admin any tenant
  if (await isGlobalAdmin(ctx.userId)) return true;

  // Fleet Manager (admin role) on their own tenant
  if (ctx.organizationId === tenantId && ctx.role === "admin") return true;

  return false;
}

/** Check if user is a Driver */
export function isDriver(ctx: SessionContext): boolean {
  return ctx.role === "member";
}

/** Require authentication, return session context or error */
export async function requireAuth(): Promise<
  | { success: true; ctx: SessionContext }
  | { success: false; error: string; code: ErrorCode }
> {
  const ctx = await getSessionContext();
  if (!ctx) {
    return {
      success: false,
      error: "Non autenticato",
      code: ErrorCode.UNAUTHORIZED,
    };
  }
  return { success: true, ctx };
}

/** Require tenant admin role (owner or admin on the tenant) */
export async function requireTenantAdmin(tenantId: string): Promise<
  | { success: true; ctx: SessionContext }
  | { success: false; error: string; code: ErrorCode }
> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;

  const isAdmin = await isTenantAdmin(authResult.ctx, tenantId);
  if (!isAdmin) {
    return {
      success: false,
      error: "Permessi insufficienti per questo tenant",
      code: ErrorCode.FORBIDDEN,
    };
  }

  return authResult;
}
