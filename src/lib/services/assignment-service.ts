import type {
  VehicleAssignment,
  Employee,
  TenantVehicle,
  CatalogVehicle,
  Engine,
} from "@/generated/prisma/client";
import type { PrismaClientWithTenant } from "@/lib/db/client";
import type { AssignVehicleInput } from "@/lib/schemas/vehicle-assignment";

// ---------------------------------------------------------------------------
// Tipi pubblici
// ---------------------------------------------------------------------------

export type VehicleAssignmentWithEmployee = VehicleAssignment & {
  employee: Employee;
};

export type VehicleAssignmentWithVehicle = VehicleAssignment & {
  vehicle: TenantVehicle & {
    catalogVehicle: CatalogVehicle & { engines: Engine[] };
  };
};

// ---------------------------------------------------------------------------
// Assegnazione veicolo a dipendente
// ---------------------------------------------------------------------------

/**
 * Assegna un veicolo a un dipendente.
 * Se il veicolo ha gia un'assegnazione attiva, la chiude con endDate = startDate
 * della nuova assegnazione, poi crea la nuova assegnazione.
 */
export async function assignVehicle(
  db: PrismaClientWithTenant,
  data: AssignVehicleInput
): Promise<VehicleAssignmentWithEmployee> {
  // 1. Cerca assegnazione attiva corrente (endDate is null)
  const currentAssignment = await db.vehicleAssignment.findFirst({
    where: {
      vehicleId: data.vehicleId,
      endDate: null,
    },
  });

  // 2. Se esiste, chiudi l'assegnazione precedente
  if (currentAssignment) {
    // Validazione: la nuova startDate deve essere >= endDate della precedente
    if (data.startDate < currentAssignment.startDate) {
      throw new Error(
        "La data di inizio non puo essere precedente alla data di inizio dell'assegnazione corrente"
      );
    }

    await db.vehicleAssignment.update({
      where: { id: currentAssignment.id },
      data: { endDate: data.startDate },
    });
  }

  // 3. Crea nuova assegnazione
  const newAssignment = await db.vehicleAssignment.create({
    data: {
      tenantId: "", // Overwritten by tenant extension
      vehicleId: data.vehicleId,
      employeeId: data.employeeId,
      startDate: data.startDate,
      notes: data.notes ?? null,
    },
    include: {
      employee: true,
    },
  });

  // 4. Aggiorna il campo assignedEmployeeId del veicolo
  await db.tenantVehicle.update({
    where: { id: data.vehicleId },
    data: { assignedEmployeeId: data.employeeId },
  });

  return newAssignment as unknown as VehicleAssignmentWithEmployee;
}

// ---------------------------------------------------------------------------
// Rimozione assegnazione
// ---------------------------------------------------------------------------

/**
 * Rimuove l'assegnazione attiva di un veicolo.
 * Chiude l'assegnazione corrente con la endDate fornita
 * e imposta assignedEmployeeId a null sul veicolo.
 */
export async function unassignVehicle(
  db: PrismaClientWithTenant,
  vehicleId: string,
  endDate: Date,
  notes?: string
): Promise<void> {
  // 1. Cerca assegnazione attiva
  const currentAssignment = await db.vehicleAssignment.findFirst({
    where: {
      vehicleId,
      endDate: null,
    },
  });

  if (!currentAssignment) {
    throw new Error("Nessuna assegnazione attiva trovata per questo veicolo");
  }

  // 2. Chiudi assegnazione
  const updateData: Record<string, unknown> = { endDate };
  if (notes !== undefined) {
    updateData.notes = notes;
  }
  await db.vehicleAssignment.update({
    where: { id: currentAssignment.id },
    data: updateData,
  });

  // 3. Rimuovi assegnatario dal veicolo
  await db.tenantVehicle.update({
    where: { id: vehicleId },
    data: { assignedEmployeeId: null },
  });
}

// ---------------------------------------------------------------------------
// Storico assegnazioni per veicolo
// ---------------------------------------------------------------------------

/**
 * Recupera lo storico di tutte le assegnazioni per un veicolo,
 * ordinato per startDate DESC (piu recente prima).
 */
export async function getAssignmentHistory(
  db: PrismaClientWithTenant,
  vehicleId: string
): Promise<VehicleAssignmentWithEmployee[]> {
  const assignments = await db.vehicleAssignment.findMany({
    where: { vehicleId },
    include: { employee: true },
    orderBy: { startDate: "desc" },
  });
  return assignments as unknown as VehicleAssignmentWithEmployee[];
}

// ---------------------------------------------------------------------------
// Assegnazione attiva per veicolo
// ---------------------------------------------------------------------------

/**
 * Recupera l'assegnazione attiva (endDate is null) per un veicolo.
 */
export async function getCurrentAssignment(
  db: PrismaClientWithTenant,
  vehicleId: string
): Promise<VehicleAssignmentWithEmployee | null> {
  const assignment = await db.vehicleAssignment.findFirst({
    where: {
      vehicleId,
      endDate: null,
    },
    include: { employee: true },
  });
  return assignment as unknown as VehicleAssignmentWithEmployee | null;
}

// ---------------------------------------------------------------------------
// Assegnazioni per dipendente (con dati veicolo)
// ---------------------------------------------------------------------------

/**
 * Recupera tutte le assegnazioni (attive e passate) per un dipendente,
 * con dati del veicolo e catalogo, ordinate per startDate DESC.
 */
export async function getVehiclesByEmployee(
  db: PrismaClientWithTenant,
  employeeId: string
): Promise<VehicleAssignmentWithVehicle[]> {
  const assignments = await db.vehicleAssignment.findMany({
    where: { employeeId },
    include: {
      vehicle: {
        include: {
          catalogVehicle: {
            include: { engines: true },
          },
        },
      },
    },
    orderBy: { startDate: "desc" },
  });
  return assignments as unknown as VehicleAssignmentWithVehicle[];
}
