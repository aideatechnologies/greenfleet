"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DriverDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Driver dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-16 pb-16 md:pb-0">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Errore nel caricamento della dashboard
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Si e verificato un problema durante il caricamento dei dati.
              Riprova tra qualche istante.
            </p>
          </div>
          <Button onClick={reset} variant="default">
            Riprova
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
