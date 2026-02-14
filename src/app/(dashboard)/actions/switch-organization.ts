"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { headers } from "next/headers";
import {
  getSessionContext,
  isGlobalAdmin,
} from "@/lib/auth/permissions";
import { logger } from "@/lib/utils/logger";
import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrgSummary = {
  id: string;
  name: string;
  slug: string;
};

// ---------------------------------------------------------------------------
// List all organisations (admin only)
// ---------------------------------------------------------------------------

export async function listOrganizationsAction(): Promise<
  ActionResult<OrgSummary[]>
> {
  const ctx = await getSessionContext();
  if (!ctx) {
    return { success: false, error: "Non autenticato", code: ErrorCode.UNAUTHORIZED };
  }

  const admin = await isGlobalAdmin(ctx.userId);
  if (!admin) {
    return { success: false, error: "Non autorizzato", code: ErrorCode.FORBIDDEN };
  }

  try {
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: orgs };
  } catch (error) {
    logger.error({ error, userId: ctx.userId }, "Failed to list organizations");
    return {
      success: false,
      error: "Errore nel recupero delle organizzazioni",
      code: ErrorCode.INTERNAL,
    };
  }
}

// ---------------------------------------------------------------------------
// Switch active organisation (admin only, bypasses membership check)
// ---------------------------------------------------------------------------

export async function switchOrganizationAction(
  organizationId: string
): Promise<ActionResult<null>> {
  const ctx = await getSessionContext();
  if (!ctx) {
    return { success: false, error: "Non autenticato", code: ErrorCode.UNAUTHORIZED };
  }

  const admin = await isGlobalAdmin(ctx.userId);
  if (!admin) {
    return { success: false, error: "Non autorizzato", code: ErrorCode.FORBIDDEN };
  }

  // Verify target org exists and is active
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, isActive: true },
  });

  if (!org) {
    return {
      success: false,
      error: "Organizzazione non trovata",
      code: ErrorCode.NOT_FOUND,
    };
  }

  if (!org.isActive) {
    return {
      success: false,
      error: "Organizzazione disattivata",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { success: false, error: "Sessione non valida", code: ErrorCode.UNAUTHORIZED };
    }

    // Directly update the session's activeOrganizationId in the DB
    await prisma.session.update({
      where: { id: session.session.id },
      data: { activeOrganizationId: organizationId },
    });

    return { success: true, data: null };
  } catch (error) {
    logger.error(
      { error, userId: ctx.userId, targetOrgId: organizationId },
      "Failed to switch organization"
    );
    return {
      success: false,
      error: "Errore nel cambio organizzazione",
      code: ErrorCode.INTERNAL,
    };
  }
}
