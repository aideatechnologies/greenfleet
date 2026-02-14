"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface EmissionErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EmissionError({ error, reset }: EmissionErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("EmissionError:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Emissioni</h2>
        <p className="text-muted-foreground">
          Analisi aggregata delle emissioni CO2 della flotta aziendale.
        </p>
      </div>

      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <CardTitle>Errore nel caricamento</CardTitle>
          </div>
          <CardDescription>
            Si e verificato un errore durante il caricamento dei dati delle
            emissioni.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {error.message || "Errore imprevisto. Riprova tra qualche istante."}
          </p>
          <Button onClick={reset} variant="outline">
            Riprova
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
