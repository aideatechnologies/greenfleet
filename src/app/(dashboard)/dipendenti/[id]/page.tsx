import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { getSessionContext, isTenantAdmin } from "@/lib/auth/permissions";
import { getPrismaForTenant } from "@/lib/db/client";
import { getEmployeeById } from "@/lib/services/employee-service";
import { getVehiclesByEmployee } from "@/lib/services/assignment-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Pencil, Car } from "lucide-react";
import { EmployeeStatusButton } from "./EmployeeStatusButton";

export default async function EmployeeDetailPage({
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
  const canEdit = await isTenantAdmin(ctx, tenantId);
  const prisma = getPrismaForTenant(tenantId);
  const [employee, vehicleAssignments] = await Promise.all([
    getEmployeeById(prisma, id),
    getVehiclesByEmployee(prisma, id),
  ]);

  if (!employee) {
    notFound();
  }

  const currentVehicleAssignment = vehicleAssignments.find(
    (a) => a.endDate === null
  );

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
        <span className="text-foreground">
          {employee.firstName} {employee.lastName}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {employee.firstName} {employee.lastName}
            </h2>
            <Badge
              variant={employee.isActive ? "default" : "secondary"}
              className={
                employee.isActive
                  ? "bg-green-600 hover:bg-green-600/90"
                  : "bg-red-100 text-red-700 hover:bg-red-100/90"
              }
            >
              {employee.isActive ? "Attivo" : "Inattivo"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Dettagli del dipendente
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/dipendenti/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifica
              </Link>
            </Button>
            <EmployeeStatusButton
              employeeId={String(employee.id)}
              employeeName={`${employee.firstName} ${employee.lastName}`}
              isActive={employee.isActive}
            />
          </div>
        )}
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Details card */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni personali</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Nome
                </dt>
                <dd className="mt-1 text-sm">{employee.firstName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Cognome
                </dt>
                <dd className="mt-1 text-sm">{employee.lastName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 text-sm">
                  {employee.email ? (
                    <a
                      href={`mailto:${employee.email}`}
                      className="text-primary hover:underline"
                    >
                      {employee.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Telefono
                </dt>
                <dd className="mt-1 text-sm">
                  {employee.phone ? (
                    <a
                      href={`tel:${employee.phone}`}
                      className="text-primary hover:underline"
                    >
                      {employee.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Codice Fiscale
                </dt>
                <dd className="mt-1 text-sm">
                  {employee.fiscalCode ? (
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {employee.fiscalCode}
                    </code>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Matricola
                </dt>
                <dd className="mt-1 text-sm">
                  {employee.matricola || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Km medi mensili
                </dt>
                <dd className="mt-1 text-sm">
                  {employee.avgMonthlyKm != null
                    ? employee.avgMonthlyKm.toLocaleString("it-IT")
                    : <span className="text-muted-foreground">-</span>}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Car List
                </dt>
                <dd className="mt-1 text-sm">
                  {employee.carlist ? (
                    employee.carlist.name
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Data creazione
                </dt>
                <dd className="mt-1 text-sm">
                  {new Date(employee.createdAt).toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Veicolo Assegnato */}
        <Card>
          <CardHeader>
            <CardTitle>Veicolo Assegnato</CardTitle>
          </CardHeader>
          <CardContent>
            {currentVehicleAssignment ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="default"
                    className="bg-green-600 hover:bg-green-600/90"
                  >
                    Attivo
                  </Badge>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Targa</dt>
                  <dd className="font-mono font-medium uppercase tracking-wider">
                    <Link
                      href={`/vehicles/${currentVehicleAssignment.vehicle.id}`}
                      className="text-primary hover:underline"
                    >
                      {currentVehicleAssignment.vehicle.licensePlate}
                    </Link>
                  </dd>
                  <dt className="text-muted-foreground">Veicolo</dt>
                  <dd className="font-medium">
                    {currentVehicleAssignment.vehicle.catalogVehicle.marca}{" "}
                    {currentVehicleAssignment.vehicle.catalogVehicle.modello}
                  </dd>
                  <dt className="text-muted-foreground">Data assegnazione</dt>
                  <dd className="font-medium">
                    {format(
                      new Date(currentVehicleAssignment.startDate),
                      "dd MMM yyyy",
                      { locale: it }
                    )}
                  </dd>
                  {currentVehicleAssignment.notes && (
                    <>
                      <dt className="text-muted-foreground">Note</dt>
                      <dd className="font-medium">
                        {currentVehicleAssignment.notes}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Car className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Nessun veicolo attualmente assegnato a questo dipendente.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Storico Veicoli */}
      {vehicleAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Storico Veicoli ({vehicleAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicleAssignments.map((assignment, index) => {
              const isActive = assignment.endDate === null;
              return (
                <div key={assignment.id}>
                  {index > 0 && <Separator className="mb-3" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/vehicles/${assignment.vehicle.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {assignment.vehicle.licensePlate}
                        </Link>
                        <span className="text-sm text-muted-foreground">
                          {assignment.vehicle.catalogVehicle.marca}{" "}
                          {assignment.vehicle.catalogVehicle.modello}
                        </span>
                        {isActive && (
                          <Badge
                            variant="default"
                            className="bg-green-600 hover:bg-green-600/90"
                          >
                            Attivo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {format(
                            new Date(assignment.startDate),
                            "dd MMM yyyy",
                            { locale: it }
                          )}
                        </span>
                        <span>-</span>
                        <span>
                          {isActive
                            ? "In corso"
                            : format(
                                new Date(assignment.endDate!),
                                "dd MMM yyyy",
                                { locale: it }
                              )}
                        </span>
                      </div>
                      {assignment.notes && (
                        <p className="text-xs text-muted-foreground">
                          {assignment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
