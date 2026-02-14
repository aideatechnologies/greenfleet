import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { prisma as basePrisma } from "@/lib/db/client";
import { getAuditEntries } from "@/lib/services/audit-service";
import { auditLogFilterSchema } from "@/lib/schemas/audit-log";
import { AuditLogTable } from "./components/AuditLogTable";
import { ScrollText } from "lucide-react";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || !ctx.organizationId) {
    redirect("/login");
  }

  // Only owner (Platform Admin) can access audit log
  if (ctx.role !== "owner") {
    redirect("/");
  }

  const rawParams = await searchParams;

  const filters = auditLogFilterSchema.parse({
    entityType:
      typeof rawParams.entityType === "string"
        ? rawParams.entityType
        : undefined,
    userId:
      typeof rawParams.userId === "string" ? rawParams.userId : undefined,
    actionType:
      typeof rawParams.actionType === "string"
        ? rawParams.actionType
        : undefined,
    dateFrom:
      typeof rawParams.dateFrom === "string" ? rawParams.dateFrom : undefined,
    dateTo:
      typeof rawParams.dateTo === "string" ? rawParams.dateTo : undefined,
    page: typeof rawParams.page === "string" ? rawParams.page : undefined,
    pageSize:
      typeof rawParams.pageSize === "string" ? rawParams.pageSize : undefined,
  });

  const tenantPrisma = getPrismaForTenant(ctx.organizationId);
  const result = await getAuditEntries(tenantPrisma, filters);

  // Get users for the tenant (for filter combobox)
  const members = await basePrisma.member.findMany({
    where: { organizationId: ctx.organizationId },
    include: { user: { select: { id: true, name: true } } },
  });
  const users = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
  }));

  // Serialize dates for client component
  const serializedData = result.data.map((entry) => ({
    ...entry,
    timestamp: entry.timestamp.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
        </div>
        <p className="text-muted-foreground mt-1">
          Tracciamento completo di tutte le modifiche ai dati della piattaforma.
        </p>
      </div>

      <AuditLogTable
        initialData={serializedData}
        pagination={result.pagination}
        users={users}
        currentFilters={{
          entityType: filters.entityType,
          userId: filters.userId,
          actionType: filters.actionType,
          dateFrom:
            filters.dateFrom
              ? filters.dateFrom.toISOString().split("T")[0]
              : undefined,
          dateTo:
            filters.dateTo
              ? filters.dateTo.toISOString().split("T")[0]
              : undefined,
          page: filters.page,
        }}
      />
    </div>
  );
}
