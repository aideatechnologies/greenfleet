"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Error boundary for the dashboard route segment.
 * Displays a user-friendly error message with a retry button.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for development debugging
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-7xl">
      <Card className="mx-auto max-w-lg mt-12">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Errore nel caricamento della dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Si e verificato un errore durante il caricamento dei dati.
              Riprova tra qualche istante.
            </p>
          </div>
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            Riprova
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
