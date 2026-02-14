import { redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { AddVehicleFlow } from "./AddVehicleFlow";

export default async function NewVehiclePage() {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const canManage = await isTenantAdmin(ctx, ctx.organizationId);
  if (!canManage) {
    redirect("/vehicles");
  }

  return <AddVehicleFlow />;
}
