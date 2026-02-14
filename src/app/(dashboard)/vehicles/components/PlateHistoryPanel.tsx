"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReplatDialog } from "./ReplatDialog";

type PlateHistoryPanelProps = {
  vehicleId: string;
  currentPlate: string;
  canEdit: boolean;
};

export function PlateHistoryPanel({
  vehicleId,
  currentPlate,
  canEdit,
}: PlateHistoryPanelProps) {
  const [replatOpen, setReplatOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Targa</CardTitle>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReplatOpen(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Ritargatura
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="rounded-md border bg-muted px-4 py-2 font-mono text-2xl font-bold uppercase tracking-wider">
              {currentPlate}
            </span>
          </div>
        </CardContent>
      </Card>

      <ReplatDialog
        vehicleId={vehicleId}
        currentPlate={currentPlate}
        open={replatOpen}
        onOpenChange={setReplatOpen}
      />
    </>
  );
}
