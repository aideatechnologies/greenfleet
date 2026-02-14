import { prisma } from "@/lib/db/client";
import { auth } from "@/lib/auth/auth";
import { logger } from "@/lib/utils/logger";
import { headers } from "next/headers";
import type { CreateUserInput } from "@/lib/schemas/user";

export const userService = {
  async getUserInTenant(userId: string, tenantId: string) {
    const member = await prisma.member.findFirst({
      where: { userId, organizationId: tenantId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!member) return null;

    return {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
    };
  },

  async listUsers(tenantId?: string) {
    const whereClause = tenantId
      ? { organizationId: tenantId }
      : {};

    const members = await prisma.member.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            emailVerified: true,
          },
        },
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return members.map((m) => ({
      id: m.user.id,
      memberId: m.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      tenantId: m.organizationId,
      tenantName: m.organization.name,
      createdAt: m.user.createdAt,
      emailVerified: m.user.emailVerified,
    }));
  },

  async createUser(data: CreateUserInput) {
    // Create user via Better Auth API
    const reqHeaders = await headers();
    const result = await auth.api.signUpEmail({
      body: {
        name: data.name,
        email: data.email,
        password: data.password,
      },
      headers: reqHeaders,
    });

    if (!result) {
      throw new Error("SIGNUP_FAILED");
    }

    const userId = (result as { user?: { id: string } }).user?.id;
    if (!userId) {
      throw new Error("SIGNUP_FAILED");
    }

    // Add member to organization with role
    await prisma.member.create({
      data: {
        userId,
        organizationId: data.tenantId,
        role: data.role,
      },
    });

    // Set active organization for the new user's sessions
    await prisma.session.updateMany({
      where: { userId },
      data: { activeOrganizationId: data.tenantId },
    });

    logger.info(
      { userId, role: data.role, tenantId: data.tenantId },
      "User created and assigned to tenant"
    );

    return { id: userId, name: data.name, email: data.email, role: data.role };
  },

  async updateUser(
    userId: string,
    tenantId: string,
    data: { name?: string; email?: string; role?: string }
  ) {
    if (data.name || data.email) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
        },
      });
    }

    if (data.role) {
      await prisma.member.updateMany({
        where: { userId, organizationId: tenantId },
        data: { role: data.role },
      });
    }

    logger.info({ userId, tenantId }, "User updated");
    return { id: userId };
  },

  async deactivateUser(userId: string, tenantId: string) {
    // Remove member from the organization (soft delete from tenant)
    await prisma.member.deleteMany({
      where: { userId, organizationId: tenantId },
    });

    // Delete all sessions (force logout)
    await prisma.session.deleteMany({
      where: { userId },
    });

    logger.info({ userId, tenantId }, "User deactivated (member removed, sessions invalidated)");
    return { id: userId };
  },
};
