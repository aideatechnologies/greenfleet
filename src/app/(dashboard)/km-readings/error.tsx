"use client";

import { Button } from "@/components/ui/button";

export default function KmReadingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <h2 className="text-xl font-semibold">Si e verificato un errore</h2>
      <p className="text-muted-foreground">
        {error.message || "Impossibile caricare le rilevazioni km."}
      </p>
      <Button onClick={reset}>Riprova</Button>
    </div>
  );
}
