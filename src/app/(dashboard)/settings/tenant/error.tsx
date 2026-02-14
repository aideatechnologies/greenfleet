"use client";

import { Button } from "@/components/ui/button";

export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-semibold">Si è verificato un errore</h2>
      <p className="text-muted-foreground">
        {error.message || "Impossibile caricare i dati delle società."}
      </p>
      <Button onClick={reset}>Riprova</Button>
    </div>
  );
}
