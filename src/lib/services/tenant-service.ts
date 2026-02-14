import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";
import type { CreateTenantInput, UpdateTenantInput } from "@/lib/schemas/tenant";

export const tenantService = {
  async listTenants() {
    return prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true } },
      },
    });
  },

  async getTenantById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } },
      },
    });
  },

  async getTenantBySlug(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
    });
  },

  async createTenant(data: CreateTenantInput) {
    try {
      const tenant = await prisma.organization.create({
        data: {
          name: data.name,
          slug: data.slug,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          isActive: true,
        },
      });

      logger.info({ tenantId: tenant.id, slug: tenant.slug }, "Tenant created");
      return tenant;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        throw new Error("SLUG_EXISTS");
      }
      throw error;
    }
  },

  async updateTenant(id: string, data: UpdateTenantInput) {
    try {
      const tenant = await prisma.organization.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.slug !== undefined && { slug: data.slug }),
          ...(data.metadata !== undefined && {
            metadata: JSON.stringify(data.metadata),
          }),
        },
      });

      logger.info({ tenantId: tenant.id }, "Tenant updated");
      return tenant;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        throw new Error("SLUG_EXISTS");
      }
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2025"
      ) {
        throw new Error("NOT_FOUND");
      }
      throw error;
    }
  },

  async deactivateTenant(id: string, reason?: string) {
    try {
      const tenant = await prisma.organization.update({
        where: { id },
        data: { isActive: false },
      });

      // INTENTIONAL CROSS-TENANT: Invalidate all sessions for this organization
      await prisma.session.deleteMany({
        where: { activeOrganizationId: id },
      });

      logger.info({ tenantId: id, reason }, "Tenant deactivated, sessions invalidated");
      return tenant;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2025"
      ) {
        throw new Error("NOT_FOUND");
      }
      throw error;
    }
  },

  async reactivateTenant(id: string) {
    try {
      const tenant = await prisma.organization.update({
        where: { id },
        data: { isActive: true },
      });

      logger.info({ tenantId: id }, "Tenant reactivated");
      return tenant;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "P2025"
      ) {
        throw new Error("NOT_FOUND");
      }
      throw error;
    }
  },

  async initializeTenantFeatures(tenantId: string) {
    const { ALL_FEATURE_KEYS, DEFAULT_FEATURES } = await import(
      "./feature-keys"
    );

    for (const featureKey of ALL_FEATURE_KEYS) {
      await prisma.tenantFeature.upsert({
        where: { tenantId_featureKey: { tenantId, featureKey } },
        update: {},
        create: {
          tenantId,
          featureKey,
          enabled: DEFAULT_FEATURES.includes(featureKey),
        },
      });
    }

    logger.info({ tenantId }, "Tenant features initialized");
  },
};
