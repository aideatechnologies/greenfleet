"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { VehicleAssignmentWithEmployee } from "@/lib/services/assignment-service";

type AssignmentHistoryProps = {
  assignments: VehicleAssignmentWithEmployee[];
};

export function AssignmentHistory({ assignments }: AssignmentHistoryProps) {
  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storico Assegnazioni</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nessuna assegnazione registrata per questo veicolo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storico Assegnazioni ({assignments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.map((assignment, index) => {
          const isActive = assignment.endDate === null;
          return (
            <div key={assignment.id}>
              {index > 0 && <Separator className="mb-3" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {assignment.employee.firstName}{" "}
                      {assignment.employee.lastName}
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
                      {format(new Date(assignment.startDate), "dd MMM yyyy", {
                        locale: it,
                      })}
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
  );
}
