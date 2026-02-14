import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { ErrorCode } from "@/types/action-result";

type AdminCheckResult =
  | { success: true; userId: string }
  | { success: false; error: string; code: ErrorCode };

export async function requireAdmin(): Promise<AdminCheckResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      success: false,
      error: "Non autenticato",
      code: ErrorCode.UNAUTHORIZED,
    };
  }

  // Check if user is admin/owner in any organization
  const adminMembership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ["admin", "owner"] },
    },
  });

  if (!adminMembership) {
    return {
      success: false,
      error: "Permessi insufficienti",
      code: ErrorCode.FORBIDDEN,
    };
  }

  return { success: true, userId: session.user.id };
}
