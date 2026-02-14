"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Download, Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import {
  importInfocarDataBatch,
  importInfocarDataIncremental,
  checkInfocarDataHealth,
} from "@/app/(dashboard)/settings/import/actions/import-infocardata";

type Props = {
  totalCatalog: number;
  totalEngines: number;
  lastSyncAt: string | null;
};

export function CatalogImportPanel({ totalCatalog, totalEngines, lastSyncAt }: Props) {
  const [loading, setLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [healthStatus, setHealthStatus] = useState<{ available: boolean; message: string } | null>(null);

  async function handleHealthCheck() {
    setHealthLoading(true);
    setHealthStatus(null);
    try {
      const result = await checkInfocarDataHealth();
      if (result.success) {
        setHealthStatus(result.data);
      } else {
        setHealthStatus({ available: false, message: result.error ?? "Errore sconosciuto" });
      }
    } catch {
      setHealthStatus({ available: false, message: "Errore di rete" });
    } finally {
      setHealthLoading(false);
    }
  }

  async function handleImport(type: "batch" | "incremental") {
    setLoading(true);
    setMessage(null);
    try {
      const result = type === "batch"
        ? await importInfocarDataBatch()
        : await importInfocarDataIncremental();

      if (result.success) {
        const p = result.data;
        setMessage({
          type: "success",
          text: `Import completato: ${p.createdRecords} creati, ${p.updatedRecords} aggiornati, ${p.skippedRecords} saltati${p.errors.length > 0 ? `, ${p.errors.length} errori` : ""}`,
        });
      } else {
        setMessage({ type: "error", text: result.error ?? "Errore durante l'import" });
      }
    } catch {
      setMessage({ type: "error", text: "Errore imprevisto durante l'import" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5" />
            Stato Catalogo
          </CardTitle>
          <CardDescription>
            Statistiche del catalogo veicoli locale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Veicoli</p>
              <p className="text-2xl font-bold">{totalCatalog.toLocaleString("it-IT")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Motori</p>
              <p className="text-2xl font-bold">{totalEngines.toLocaleString("it-IT")}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ultima sincronizzazione</p>
            <p className="text-sm font-medium">
              {lastSyncAt
                ? new Date(lastSyncAt).toLocaleString("it-IT")
                : "Mai eseguita"}
            </p>
          </div>

          {/* Health Check */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleHealthCheck}
              disabled={healthLoading}
            >
              {healthLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Verifica connessione
            </Button>
            {healthStatus && (
              <div className="mt-2 flex items-start gap-2">
                {healthStatus.available ? (
                  <CheckCircle className="mt-0.5 size-4 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 size-4 text-red-600 shrink-0" />
                )}
                <p className="text-sm">{healthStatus.message}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-5" />
            Import Dati
          </CardTitle>
          <CardDescription>
            Importa veicoli dal database InfocarData nel catalogo locale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Button
                onClick={() => handleImport("batch")}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                Import Completo
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Importa tutti i veicoli dal database InfoCar. Operazione lunga per database grandi.
              </p>
            </div>

            <div>
              <Button
                variant="secondary"
                onClick={() => handleImport("incremental")}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Import Incrementale
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Aggiorna solo i veicoli modificati dall&apos;ultima sincronizzazione.
              </p>
            </div>
          </div>

          {/* Status message */}
          {message && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 ${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
              )}
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          {loading && (
            <Badge variant="outline" className="animate-pulse">
              Import in corso... Questa operazione potrebbe richiedere diversi minuti.
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
