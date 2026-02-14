import { Prisma } from "@/generated/prisma/client";

// Models that are global (not filtered by tenantId)
const GLOBAL_MODELS = [
  "User",
  "Session",
  "Account",
  "Verification",
  "Organization",
  "Member",
  "Invitation",
  "TenantFeature",
  "CatalogVehicle",
  "Engine",
  "EmissionConversionConfig",
  "EmissionFactor",
  "MacroFuelType",
  "FuelTypeMacroMapping",
  "GwpConfig",
  "CarlistVehicle",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export function tenantExtension(tenantId: string) {
  return Prisma.defineExtension({
    name: "tenant-isolation",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          return query(args);
        },
        async create({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).data = { ...(args as any).data, tenantId };
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          const data = Array.isArray((args as any).data)
            ? (args as any).data
            : [(args as any).data];
          (args as any).data = data.map((item: any) => ({
            ...item,
            tenantId,
          }));
          return query(args);
        },
        async update({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async upsert({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).where = { ...(args as any).where, tenantId };
          (args as any).create = { ...(args as any).create, tenantId };
          return query(args);
        },
        async delete({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async count({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (GLOBAL_MODELS.includes(model)) return query(args);
          (args as any).where = { ...(args as any).where, tenantId };
          return query(args);
        },
      },
    },
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */
