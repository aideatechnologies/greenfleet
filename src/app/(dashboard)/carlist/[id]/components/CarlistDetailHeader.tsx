"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarlistForm } from "../../components/CarlistForm";
import type { CarlistWithVehicles } from "@/lib/services/carlist-service";

type CarlistDetailHeaderProps = {
  carlist: CarlistWithVehicles;
  canEdit: boolean;
};

export function CarlistDetailHeader({
  carlist,
  canEdit,
}: CarlistDetailHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{carlist.name}</h2>
        {carlist.description && (
          <p className="mt-1 text-muted-foreground">{carlist.description}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {carlist.vehicles.length}{" "}
          {carlist.vehicles.length === 1 ? "veicolo" : "veicoli"}
        </p>
      </div>
      {canEdit && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Modifica
          </Button>
          <CarlistForm
            mode="edit"
            carlistId={carlist.id}
            defaultValues={{
              name: carlist.name,
              description: carlist.description ?? "",
            }}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
        </>
      )}
    </div>
  );
}
