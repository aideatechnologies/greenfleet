import { prisma } from "@/lib/db/client";
import type { CatalogSearchParams } from "@/lib/schemas/catalog-search";
import type { PaginatedResult } from "@/types/pagination";
import type { CatalogVehicle, Engine } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Tipi pubblici
// ---------------------------------------------------------------------------

export type CatalogVehicleWithEngines = CatalogVehicle & {
  engines: Engine[];
};

export type CatalogFilterOptions = {
  marche: string[];
  normative: string[];
  carburanti: string[];
};

// ---------------------------------------------------------------------------
// Ricerca catalogo con paginazione
// ---------------------------------------------------------------------------

export async function searchCatalog(
  params: CatalogSearchParams
): Promise<PaginatedResult<CatalogVehicleWithEngines>> {
  const { q, marca, carburante, normativa, page, pageSize, sortBy, sortDir } =
    params;

  // Costruiamo i filtri WHERE
  const where: Record<string, unknown> = {};

  // Ricerca testuale su marca + modello + allestimento
  if (q && q.trim().length > 0) {
    const searchTerm = q.trim();
    where.OR = [
      { marca: { contains: searchTerm } },
      { modello: { contains: searchTerm } },
      { allestimento: { contains: searchTerm } },
    ];
  }

  // Filtro per marca esatta
  if (marca) {
    where.marca = marca;
  }

  // Filtro per normativa esatta
  if (normativa) {
    where.normativa = normativa;
  }

  // Filtro per tipo carburante (tramite relazione engine)
  if (carburante) {
    where.engines = {
      some: {
        fuelType: carburante,
      },
    };
  }

  // Ordinamento dinamico
  const orderBy: Record<string, string> = {};
  if (sortBy) {
    orderBy[sortBy] = sortDir;
  } else {
    orderBy.marca = "asc";
    orderBy.modello = "asc";
  }

  // Query parallele: conteggio + dati
  const [totalCount, data] = await Promise.all([
    prisma.catalogVehicle.count({ where }),
    prisma.catalogVehicle.findMany({
      where,
      include: { engines: true },
      orderBy: sortBy ? { [sortBy]: sortDir } : [{ marca: "asc" }, { modello: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
}

// ---------------------------------------------------------------------------
// Opzioni filtri (valori distinti)
// ---------------------------------------------------------------------------

export async function getFilterOptions(): Promise<CatalogFilterOptions> {
  const [marcheRaw, normativeRaw, carburantiRaw] = await Promise.all([
    prisma.catalogVehicle.findMany({
      distinct: ["marca"],
      select: { marca: true },
      orderBy: { marca: "asc" },
    }),
    prisma.catalogVehicle.findMany({
      distinct: ["normativa"],
      select: { normativa: true },
      where: { normativa: { not: null } },
      orderBy: { normativa: "asc" },
    }),
    prisma.engine.findMany({
      distinct: ["fuelType"],
      select: { fuelType: true },
      orderBy: { fuelType: "asc" },
    }),
  ]);

  return {
    marche: marcheRaw.map((r) => r.marca),
    normative: normativeRaw
      .map((r) => r.normativa)
      .filter((v): v is string => v !== null),
    carburanti: carburantiRaw.map((r) => r.fuelType),
  };
}

// ---------------------------------------------------------------------------
// Dettaglio singolo veicolo
// ---------------------------------------------------------------------------

export async function getCatalogVehicleById(
  id: string
): Promise<CatalogVehicleWithEngines | null> {
  return prisma.catalogVehicle.findUnique({
    where: { id },
    include: { engines: true },
  });
}
