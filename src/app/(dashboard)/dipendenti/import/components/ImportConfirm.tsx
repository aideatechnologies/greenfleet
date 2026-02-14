"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type ImportConfirmProps = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  isImporting: boolean;
  onConfirmImport: () => void;
};

export function ImportConfirm({
  totalRows,
  validRows,
  errorRows,
  isImporting,
  onConfirmImport,
}: ImportConfirmProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-lg font-semibold">Riepilogo importazione</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-md border px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Totale righe</p>
              <p className="text-3xl font-bold">{totalRows}</p>
            </div>
            <div className="rounded-md border border-green-200 dark:border-green-800 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-xs text-muted-foreground">
                  Da importare
                </p>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {validRows}
              </p>
            </div>
            <div className="rounded-md border border-red-200 dark:border-red-800 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-xs text-muted-foreground">
                  Da escludere (errori)
                </p>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {errorRows}
              </p>
            </div>
          </div>

          {errorRows > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Le righe con errori verranno ignorate. Solo le{" "}
                <span className="font-bold">{validRows}</span> righe valide
                verranno importate.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-3">
        <Checkbox
          id="confirm"
          checked={confirmed}
          onCheckedChange={(checked) => setConfirmed(checked === true)}
          disabled={isImporting}
        />
        <Label htmlFor="confirm" className="text-sm leading-relaxed cursor-pointer">
          Confermo di voler importare{" "}
          <span className="font-bold">{validRows}</span>{" "}
          {validRows === 1 ? "dipendente" : "dipendenti"} nel sistema.
          {errorRows > 0 && (
            <>
              {" "}
              Le <span className="font-bold">{errorRows}</span> righe con
              errori verranno ignorate.
            </>
          )}
        </Label>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onConfirmImport}
          disabled={!confirmed || isImporting || validRows === 0}
          size="lg"
        >
          {isImporting ? "Importazione in corso..." : "Importa"}
        </Button>
      </div>
    </div>
  );
}
