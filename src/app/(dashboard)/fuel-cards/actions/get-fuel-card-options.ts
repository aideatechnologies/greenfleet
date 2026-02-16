"use server";

import type { ActionResult } from "@/types/action-result";
import { ErrorCode } from "@/types/action-result";
import { requireAuth } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getSuppliersByTypeCode } from "@/lib/services/supplier-service";
import type { SupplierOptionItem } from "@/components/forms/SupplierSelector";
import type { VehicleOptionItem } from "@/components/forms/VehicleSelector";
import type { EmployeeOptionItem } from "@/components/forms/EmployeeSelector";

type FuelCardOptions = {
  suppliers: SupplierOptionItem[];
  vehicles: VehicleOptionItem[];
  employees: EmployeeOptionItem[];
};

export async function getFuelCardOptionsAction(): Promise<ActionResult<FuelCardOptions>> {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult;
  const { ctx } = authResult;

  const tenantId = ctx.organizationId;
  if (!tenantId) {
    return {
      success: false,
      error: "Nessun tenant attivo nella sessione",
      code: ErrorCode.FORBIDDEN,
    };
  }

  try {
    const prisma = getPrismaForTenant(tenantId);

    const [suppliers, vehicles, employees] = await Promise.all([
      getSuppliersByTypeCode(prisma, "CARBURANTE"),
      prisma.tenantVehicle.findMany({
        where: { status: "ACTIVE" },
        include: { catalogVehicle: true },
        orderBy: { licensePlate: "asc" },
      }),
      prisma.employee.findMany({
        where: { isActive: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
    ]);

    return {
      success: true,
      data: {
        suppliers: suppliers.map((s) => ({
          id: String(s.id),
          name: s.name,
          vatNumber: s.vatNumber,
          supplierType: {
            code: s.supplierType.code,
            label: s.supplierType.label,
          },
        })),
        vehicles: vehicles.map((v) => ({
          id: String(v.id),
          licensePlate: v.licensePlate,
          catalogVehicle: {
            marca: v.catalogVehicle.marca,
            modello: v.catalogVehicle.modello,
            allestimento: v.catalogVehicle.allestimento,
          },
        })),
        employees: employees.map((e) => ({
          id: String(e.id),
          firstName: e.firstName,
          lastName: e.lastName,
          email: e.email,
          employeeCode: e.employeeCode,
        })),
      },
    };
  } catch {
    return {
      success: false,
      error: "Errore nel caricamento delle opzioni",
      code: ErrorCode.INTERNAL,
    };
  }
}
