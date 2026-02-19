"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VehicleHeader } from "@/components/data-display/VehicleHeader";
import { DeltaBar } from "@/components/data-display/DeltaBar";
import { EmissionTimeSeriesChart } from "./EmissionTimeSeriesChart";
import {
  formatEmission,
  formatTheoreticalEmission,
  formatKm,
  formatFuel,
  formatDeltaPercentage,
} from "@/lib/utils/number";
import type { VehicleEmissionDetail as VehicleEmissionDetailType } from "@/types/report";

// ---------------------------------------------------------------------------
// Date formatter
// ---------------------------------------------------------------------------

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const currFmt = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

const fmtKm = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface VehicleEmissionDetailProps {
  detail: VehicleEmissionDetailType;
  fuelTypeLabels?: Record<string, string>;
}

export function VehicleEmissionDetailView({
  detail,
  fuelTypeLabels = {},
}: VehicleEmissionDetailProps) {
  // Parse makeModel into marca and modello
  const parts = detail.makeModel.split(" ");
  const marca = parts[0] ?? "";
  const modello = parts.slice(1).join(" ") ?? "";

  // Convert monthly series to EmissionTimeSeries format for chart
  const timeSeriesData = detail.monthlySeries.map((s) => ({
    period: s.period,
    periodLabel: s.periodLabel,
    theoreticalEmissions: s.theoretical,
    realEmissions: s.real,
    delta: s.real - s.theoretical,
  }));

  return (
    <div className="space-y-6">
      {/* Vehicle Header (read-only) */}
      <VehicleHeader
        vehicle={{
          id: detail.vehicleId,
          marca,
          modello,
          targa: detail.plate,
          imageUrl: detail.imageUrl ?? null,
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Emissioni Reali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatEmission(detail.realEmissions, true)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Emissioni Teoriche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatTheoreticalEmission(detail.theoreticalEmissions, true)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DeltaBar
              theoretical={detail.theoreticalEmissions}
              real={detail.realEmissions}
              variant="full"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Km Totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatKm(detail.totalKm)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Carburante: {formatFuel(detail.totalFuel)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Emission Time Series Chart */}
      <EmissionTimeSeriesChart data={timeSeriesData} />

      {/* Fuel Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rifornimenti</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.fuelRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nessun rifornimento nel periodo selezionato.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Carburante</TableHead>
                    <TableHead className="text-right">Litri</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.fuelRecords.map((record, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {dateFmt.format(new Date(record.date))}
                      </TableCell>
                      <TableCell>
                        {fuelTypeLabels[record.fuelType] ??
                          record.fuelType}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatFuel(record.quantityLiters)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {currFmt.format(record.amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtKm.format(record.odometerKm)} km
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KM Readings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rilevazioni Km</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.kmReadings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nessuna rilevazione km nel periodo selezionato.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                    <TableHead>Fonte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.kmReadings.map((reading, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {dateFmt.format(new Date(reading.date))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtKm.format(reading.odometerKm)} km
                      </TableCell>
                      <TableCell>{reading.source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
