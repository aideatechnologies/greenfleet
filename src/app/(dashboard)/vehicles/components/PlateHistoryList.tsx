"use client";

import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { LicensePlateHistoryRecord } from "@/lib/services/license-plate-service";

type PlateHistoryListProps = {
  history: LicensePlateHistoryRecord[];
};

export function PlateHistoryList({ history }: PlateHistoryListProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storico Targhe</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nessuno storico targhe registrato per questo veicolo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storico Targhe ({history.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map((record, index) => {
          const isActive = record.endDate === null;
          return (
            <div key={record.id}>
              {index > 0 && <Separator className="mb-3" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold uppercase tracking-wider">
                      {record.plateNumber}
                    </span>
                    {isActive && (
                      <Badge
                        variant="default"
                        className="bg-green-600 hover:bg-green-600/90"
                      >
                        Corrente
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {format(new Date(record.startDate), "dd MMM yyyy", {
                        locale: it,
                      })}
                    </span>
                    <span>-</span>
                    <span>
                      {isActive
                        ? "In corso"
                        : format(new Date(record.endDate!), "dd MMM yyyy", {
                            locale: it,
                          })}
                    </span>
                  </div>
                  {record.notes && (
                    <p className="text-xs text-muted-foreground">
                      {record.notes}
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
