import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getEmployeeById } from "@/lib/services/employee-service";
import { EmployeeForm } from "../../components/EmployeeForm";
import { ChevronRight } from "lucide-react";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (Number.isNaN(id)) notFound();

  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  const tenantId = ctx.organizationId;
  const canManage = await isTenantAdmin(ctx, tenantId);
  if (!canManage) {
    redirect("/dipendenti");
  }

  const prisma = getPrismaForTenant(tenantId);
  const employee = await getEmployeeById(prisma, id);

  if (!employee) {
    notFound();
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/dipendenti"
          className="hover:text-foreground transition-colors"
        >
          Dipendenti
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/dipendenti/${id}`}
          className="hover:text-foreground transition-colors"
        >
          {employee.firstName} {employee.lastName}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Modifica</span>
      </nav>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Modifica dipendente
        </h2>
        <p className="text-muted-foreground">
          Modifica i dati di {employee.firstName} {employee.lastName}.
        </p>
      </div>

      <EmployeeForm
        mode="edit"
        employeeId={String(id)}
        defaultValues={{
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email ?? "",
          phone: employee.phone ?? "",
          fiscalCode: employee.fiscalCode ?? "",
          matricola: employee.matricola ?? "",
          avgMonthlyKm: employee.avgMonthlyKm ?? undefined,
        }}
      />
    </div>
  );
}
