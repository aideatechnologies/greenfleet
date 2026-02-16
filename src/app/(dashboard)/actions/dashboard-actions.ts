"use server";

import { getSessionContext } from "@/lib/auth/permissions";
import {
  getFilteredEmissionsTrend,
  type EmissionsTrendPoint,
  type EmissionsTrendFilter,
} from "@/lib/services/dashboard-service";

export async function fetchFilteredTrend(
  filters: EmissionsTrendFilter
): Promise<EmissionsTrendPoint[]> {
  const ctx = await getSessionContext();
  if (!ctx?.organizationId) return [];

  return getFilteredEmissionsTrend(ctx.organizationId, 12, filters);
}
