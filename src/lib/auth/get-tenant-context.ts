import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { getPrismaForTenant, prisma } from "@/lib/db/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";

type TenantContext =
  | {
      hasTenant: true;
      tenantId: string;
      db: PrismaClientWithTenant;
    }
  | {
      hasTenant: false;
      tenantId: null;
      db: null;
    };

export async function getTenantContext(): Promise<TenantContext> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Not authenticated");
  }

  const sessionData = session.session as Record<string, unknown>;
  const tenantId =
    typeof sessionData.activeOrganizationId === "string"
      ? sessionData.activeOrganizationId
      : null;

  if (!tenantId) {
    return { hasTenant: false, tenantId: null, db: null };
  }

  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { isActive: true },
  });

  if (!org) {
    throw new Error("TENANT_NOT_FOUND");
  }

  if (!org.isActive) {
    throw new Error("TENANT_DEACTIVATED");
  }

  return {
    hasTenant: true,
    tenantId,
    db: getPrismaForTenant(tenantId),
  };
}
