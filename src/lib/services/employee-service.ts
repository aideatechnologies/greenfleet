import type { Employee } from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { PaginatedResult } from "@/types/pagination";
import type { CreateEmployeeInput, EmployeeFilterInput } from "@/lib/schemas/employee";

/**
 * Get paginated and filtered employees.
 * The prisma client is already tenant-scoped via the extension.
 */
export async function getEmployees(
  prisma: PrismaClientWithTenant,
  filters: EmployeeFilterInput
): Promise<PaginatedResult<Employee>> {
  const { search, isActive, page, pageSize, sortBy, sortOrder } = filters;

  const where: Record<string, unknown> = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { firstName: { contains: term } },
      { lastName: { contains: term } },
      { email: { contains: term } },
      { fiscalCode: { contains: term } },
    ];
  }

  const orderBy: Record<string, string> = {};
  if (sortBy) {
    orderBy[sortBy] = sortOrder ?? "asc";
  } else {
    orderBy.lastName = "asc";
  }

  const [data, totalCount] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

/**
 * Get a single employee by ID.
 */
export async function getEmployeeById(
  prisma: PrismaClientWithTenant,
  id: number
): Promise<Employee | null> {
  return prisma.employee.findFirst({
    where: { id },
  });
}

/**
 * Create a new employee.
 * tenantId is auto-injected by the Prisma tenant extension at runtime,
 * but we must include a placeholder to satisfy TypeScript types.
 */
export async function createEmployee(
  prisma: PrismaClientWithTenant,
  data: CreateEmployeeInput
): Promise<Employee> {
  return prisma.employee.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      fiscalCode: data.fiscalCode || null,
      matricola: (data as Record<string, unknown>).matricola as string | undefined ?? null,
      avgMonthlyKm: (data as Record<string, unknown>).avgMonthlyKm as number | undefined ?? null,
    },
  });
}

/**
 * Update an existing employee.
 * Pool pseudo-employees cannot be modified.
 */
export async function updateEmployee(
  prisma: PrismaClientWithTenant,
  id: number,
  data: CreateEmployeeInput
): Promise<Employee> {
  // Guard: Pool record cannot be modified
  const existing = await prisma.employee.findFirst({ where: { id } });
  if (existing?.isPool) {
    throw new Error("Il record Pool non può essere modificato");
  }

  return prisma.employee.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      fiscalCode: data.fiscalCode || null,
      matricola: (data as Record<string, unknown>).matricola as string | undefined ?? null,
      avgMonthlyKm: (data as Record<string, unknown>).avgMonthlyKm as number | undefined ?? null,
    },
  });
}

/**
 * Soft-deactivate an employee (set isActive = false).
 * Pool pseudo-employees cannot be deactivated.
 */
export async function deactivateEmployee(
  prisma: PrismaClientWithTenant,
  id: number
): Promise<Employee> {
  // Guard: Pool record cannot be deactivated
  const existing = await prisma.employee.findFirst({ where: { id } });
  if (existing?.isPool) {
    throw new Error("Il record Pool non può essere modificato");
  }

  return prisma.employee.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * Reactivate an employee (set isActive = true).
 */
export async function reactivateEmployee(
  prisma: PrismaClientWithTenant,
  id: number
): Promise<Employee> {
  return prisma.employee.update({
    where: { id },
    data: { isActive: true },
  });
}

/**
 * Get all active employees (for dropdowns in future stories).
 */
export async function getActiveEmployees(
  prisma: PrismaClientWithTenant
): Promise<Employee[]> {
  return prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { lastName: "asc" },
  });
}
