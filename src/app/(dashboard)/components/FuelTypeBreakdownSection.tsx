"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type {
  FuelTypeBreakdownItem,
  FuelTypeBreakdownResult,
  FuelTypeVehicleDetail,
} from "@/lib/services/dashboard-service";
import {
  formatKm,
  formatEmission,
  formatFuelConsumption,
} from "@/lib/utils/number";

// ---------------------------------------------------------------------------
// IT number formatters
// ---------------------------------------------------------------------------

const fmtIt = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const fmtIt1 = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// ---------------------------------------------------------------------------
// Chart configs
// ---------------------------------------------------------------------------

const vehicleChartConfig = {
  vehicleCount: { label: "Veicoli" },
} satisfies ChartConfig;

const emissionsChartConfig = {
  emissionsKgCO2e: { label: "Emissioni CO2e" },
} satisfies ChartConfig;

const consumptionChartConfig = {
  totalConsumption: { label: "Consumo" },
} satisfies ChartConfig;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FuelTypeBreakdownSectionProps {
  data: FuelTypeBreakdownResult;
}

export function FuelTypeBreakdownSection({
  data,
}: FuelTypeBreakdownSectionProps) {
  const [selectedItem, setSelectedItem] =
    useState<FuelTypeBreakdownItem | null>(null);

  if (data.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Flotta per Tipo Alimentazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm italic text-muted-foreground">
            Nessun dato disponibile per il mese corrente.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Items with vehicles for the donut
  const vehicleItems = data.items.filter((i) => i.vehicleCount > 0);

  // Emissions chart data (all items with emissions)
  const emissionsItems = data.items.filter((i) => i.emissionsKgCO2e > 0);

  // Consumption: thermal (litres) and electric (kWh)
  const thermalItems = data.items
    .filter((i) => i.totalLitres > 0)
    .map((i) => ({ ...i, totalConsumption: i.totalLitres }));
  const electricItems = data.items
    .filter((i) => i.totalKwh > 0)
    .map((i) => ({ ...i, totalConsumption: i.totalKwh }));

  return (
    <>
      <div className="space-y-4">
        {/* Row 1: Donut (vehicles) + Bar (emissions) */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Donut chart: vehicles per fuel type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Veicoli per Alimentazione</CardTitle>
              <CardDescription>
                Distribuzione della flotta ({data.totals.vehicles} veicoli)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={vehicleChartConfig} className="mx-auto h-[280px]">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, _name, props) => {
                          const item = props.payload as FuelTypeBreakdownItem;
                          return `${value} veicoli (${fmtIt1.format(
                            (item.vehicleCount / data.totals.vehicles) * 100
                          )}%)`;
                        }}
                        nameKey="fuelTypeLabel"
                      />
                    }
                  />
                  <Pie
                    data={vehicleItems}
                    dataKey="vehicleCount"
                    nameKey="fuelTypeLabel"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    cursor="pointer"
                    onClick={(_, index) => {
                      setSelectedItem(vehicleItems[index]);
                    }}
                  >
                    {vehicleItems.map((item) => (
                      <Cell
                        key={item.fuelType}
                        fill={item.color}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              {/* Legend */}
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                {vehicleItems.map((item) => (
                  <button
                    key={item.fuelType}
                    className="flex items-center gap-1.5 hover:underline"
                    onClick={() => setSelectedItem(item)}
                  >
                    <span
                      className="inline-block size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.fuelTypeLabel}</span>
                    <span className="text-muted-foreground">
                      ({item.vehicleCount})
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bar chart: emissions per fuel type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Emissioni per Alimentazione</CardTitle>
              <CardDescription>
                Totale: {formatEmission(data.totals.emissions, true)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={emissionsChartConfig} className="h-[280px] w-full">
                <BarChart
                  data={emissionsItems}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <YAxis
                    dataKey="fuelTypeLabel"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000
                        ? `${fmtIt1.format(v / 1000)} t`
                        : `${fmtIt.format(v)} kg`
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          formatEmission(value as number, true)
                        }
                        nameKey="fuelTypeLabel"
                      />
                    }
                  />
                  <Bar
                    dataKey="emissionsKgCO2e"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(_, index) => {
                      setSelectedItem(emissionsItems[index]);
                    }}
                  >
                    {emissionsItems.map((item) => (
                      <Cell
                        key={item.fuelType}
                        fill={item.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Fuel consumption charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Thermal fuels (L) */}
          {thermalItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Rifornimenti Carburante (Litri)
                </CardTitle>
                <CardDescription>
                  Consumo mensile per tipo di carburante termico
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={consumptionChartConfig} className="h-[250px] w-full">
                  <BarChart
                    data={thermalItems}
                    margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="fuelTypeLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${fmtIt.format(v)} L`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            `${fmtIt1.format(value as number)} L`
                          }
                          nameKey="fuelTypeLabel"
                        />
                      }
                    />
                    <Bar dataKey="totalConsumption" radius={[4, 4, 0, 0]}>
                      {thermalItems.map((item) => (
                        <Cell
                          key={item.fuelType}
                          fill={item.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Electric (kWh) */}
          {electricItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Rifornimenti Elettrici (kWh)
                </CardTitle>
                <CardDescription>
                  Consumo mensile energia elettrica (EV e ibridi)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={consumptionChartConfig} className="h-[250px] w-full">
                  <BarChart
                    data={electricItems}
                    margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="fuelTypeLabel"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${fmtIt.format(v)} kWh`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            `${fmtIt1.format(value as number)} kWh`
                          }
                          nameKey="fuelTypeLabel"
                        />
                      }
                    />
                    <Bar dataKey="totalConsumption" radius={[4, 4, 0, 0]}>
                      {electricItems.map((item) => (
                        <Cell
                          key={item.fuelType}
                          fill={item.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Row 3: Summary table with all data */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Riepilogo per Alimentazione</CardTitle>
            <CardDescription>
              Clicca su una riga per il dettaglio veicoli
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alimentazione</TableHead>
                  <TableHead className="text-right">Veicoli</TableHead>
                  <TableHead className="text-right">Km</TableHead>
                  <TableHead className="text-right">Consumo</TableHead>
                  <TableHead className="text-right">Emissioni CO2e</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow
                    key={item.fuelType}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedItem(item)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block size-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />
                        <span className="font-medium">{item.fuelTypeLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.vehicleCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.totalKm > 0 ? formatKm(item.totalKm) : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.totalLitres > 0 || item.totalKwh > 0
                        ? formatFuelConsumption(item.totalLitres, item.totalKwh)
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatEmission(item.emissionsKgCO2e, true)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmtIt1.format(item.emissionsPercentage)}%
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals */}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>Totale</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {data.totals.vehicles}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKm(data.totals.km)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{"\u2014"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEmission(data.totals.emissions, true)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    100%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Sheet */}
      <Sheet
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Veicoli {selectedItem?.fuelTypeLabel}</SheetTitle>
            <SheetDescription>
              {selectedItem?.vehicles.length} veicoli &middot;{" "}
              {selectedItem
                ? formatEmission(selectedItem.emissionsKgCO2e, true)
                : ""}
            </SheetDescription>
          </SheetHeader>
          {selectedItem && (
            <VehicleDetailTable vehicles={selectedItem.vehicles} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// Vehicle detail sub-table
// ---------------------------------------------------------------------------

function VehicleDetailTable({
  vehicles,
}: {
  vehicles: FuelTypeVehicleDetail[];
}) {
  return (
    <div className="mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Targa</TableHead>
            <TableHead>Veicolo</TableHead>
            <TableHead className="text-right">Km</TableHead>
            <TableHead className="text-right">Consumo</TableHead>
            <TableHead className="text-right">CO2e</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((v) => (
            <TableRow key={v.vehicleId}>
              <TableCell className="font-mono text-xs">
                {v.licensePlate}
              </TableCell>
              <TableCell className="text-xs">
                {v.make} {v.model}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs">
                {formatKm(v.km)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs">
                {formatFuelConsumption(v.litres, v.kwh)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-xs">
                {formatEmission(v.emissionsKgCO2e, true)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
