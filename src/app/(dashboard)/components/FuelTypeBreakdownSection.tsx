"use client";

import { useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, ArrowUpDown, ListFilter } from "lucide-react";
import { exportToCsv } from "@/lib/utils/csv-export";
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

// ---------------------------------------------------------------------------
// Flat vehicle row type + helpers
// ---------------------------------------------------------------------------

type VehicleRow = {
  vehicleId: number;
  licensePlate: string;
  make: string;
  model: string;
  fuelType: string;
  fuelTypeColor: string;
  km: number;
  litres: number;
  kwh: number;
  emissionsKgCO2e: number;
  emissionsPercentage: number;
};

function flattenVehicles(data: FuelTypeBreakdownResult): VehicleRow[] {
  const totalEmissions = data.totals.emissions || 1;
  const rows: VehicleRow[] = [];
  for (const item of data.items) {
    for (const v of item.vehicles) {
      rows.push({
        vehicleId: v.vehicleId,
        licensePlate: v.licensePlate,
        make: v.make,
        model: v.model,
        fuelType: item.fuelTypeLabel,
        fuelTypeColor: item.color,
        km: v.km,
        litres: v.litres,
        kwh: v.kwh,
        emissionsKgCO2e: v.emissionsKgCO2e,
        emissionsPercentage: (v.emissionsKgCO2e / totalEmissions) * 100,
      });
    }
  }
  return rows;
}

type SortKey = "licensePlate" | "fuelType" | "km" | "emissionsKgCO2e";
type SortDir = "asc" | "desc";

function sortRows(rows: VehicleRow[], key: SortKey, dir: SortDir): VehicleRow[] {
  return [...rows].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    const cmp =
      typeof aVal === "string"
        ? aVal.localeCompare(bVal as string, "it")
        : (aVal as number) - (bVal as number);
    return dir === "asc" ? cmp : -cmp;
  });
}

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
  const [showAllVehicles, setShowAllVehicles] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("emissionsKgCO2e");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const allVehicleRows = useMemo(() => flattenVehicles(data), [data]);

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.toLowerCase().trim();
    const rows = q
      ? allVehicleRows.filter(
          (r) =>
            r.licensePlate.toLowerCase().includes(q) ||
            r.make.toLowerCase().includes(q) ||
            r.model.toLowerCase().includes(q) ||
            r.fuelType.toLowerCase().includes(q)
        )
      : allVehicleRows;
    return sortRows(rows, sortKey, sortDir);
  }, [allVehicleRows, vehicleSearch, sortKey, sortDir]);

  function handleVehicleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "licensePlate" || key === "fuelType" ? "asc" : "desc");
    }
  }

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

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function handleExportAllVehicles() {
    exportToCsv(
      `dettaglio-emissioni-veicoli-${todayStr()}`,
      [
        { header: "Targa", accessor: (r: VehicleRow) => r.licensePlate },
        { header: "Veicolo", accessor: (r: VehicleRow) => `${r.make} ${r.model}` },
        { header: "Alimentazione", accessor: (r: VehicleRow) => r.fuelType },
        { header: "Km", accessor: (r: VehicleRow) => r.km, format: "integer" as const },
        { header: "Litri", accessor: (r: VehicleRow) => r.litres, format: "decimal2" as const },
        { header: "kWh", accessor: (r: VehicleRow) => r.kwh, format: "decimal2" as const },
        { header: "Emissioni kgCO2e", accessor: (r: VehicleRow) => r.emissionsKgCO2e, format: "decimal2" as const },
        { header: "%", accessor: (r: VehicleRow) => r.emissionsPercentage, format: "percentage" as const },
      ],
      filteredVehicles
    );
  }

  function handleExportFuelType() {
    exportToCsv(
      `flotta-per-alimentazione-${todayStr()}`,
      [
        { header: "Alimentazione", accessor: (r: FuelTypeBreakdownItem) => r.fuelTypeLabel },
        { header: "Veicoli", accessor: (r: FuelTypeBreakdownItem) => r.vehicleCount, format: "integer" },
        { header: "Km", accessor: (r: FuelTypeBreakdownItem) => r.totalKm, format: "integer" },
        { header: "Litri", accessor: (r: FuelTypeBreakdownItem) => r.totalLitres, format: "decimal2" },
        { header: "kWh", accessor: (r: FuelTypeBreakdownItem) => r.totalKwh, format: "decimal2" },
        { header: "Emissioni kgCO2e", accessor: (r: FuelTypeBreakdownItem) => r.emissionsKgCO2e, format: "decimal2" },
        { header: "%", accessor: (r: FuelTypeBreakdownItem) => r.emissionsPercentage, format: "percentage" },
      ],
      data.items
    );
  }

  function handleExportVehicles(item: FuelTypeBreakdownItem) {
    exportToCsv(
      `dettaglio-veicoli-${item.fuelTypeLabel}-${todayStr()}`,
      [
        { header: "Targa", accessor: (r: FuelTypeVehicleDetail) => r.licensePlate },
        { header: "Veicolo", accessor: (r: FuelTypeVehicleDetail) => `${r.make} ${r.model}` },
        { header: "Km", accessor: (r: FuelTypeVehicleDetail) => r.km, format: "integer" },
        { header: "Litri", accessor: (r: FuelTypeVehicleDetail) => r.litres, format: "decimal2" },
        { header: "kWh", accessor: (r: FuelTypeVehicleDetail) => r.kwh, format: "decimal2" },
        { header: "CO2e kg", accessor: (r: FuelTypeVehicleDetail) => r.emissionsKgCO2e, format: "decimal2" },
      ],
      item.vehicles
    );
  }

  // Items with vehicles for the donut
  const vehicleItems = data.items.filter((i) => i.vehicleCount > 0);

  // Emissions chart data (all items with emissions)
  const emissionsItems = data.items.filter((i) => i.emissionsKgCO2e > 0);

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

        {/* Row 2: Summary table with all data */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Riepilogo per Alimentazione</CardTitle>
              <CardDescription>
                Clicca su una riga per il dettaglio veicoli
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {allVehicleRows.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllVehicles(true)}
                >
                  <ListFilter className="h-4 w-4 mr-1" />
                  Tutti i Veicoli
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExportFuelType}>
                <Download className="h-4 w-4 mr-1" />
                Esporta CSV
              </Button>
            </div>
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

      {/* Drill-down Sheet (single fuel type) */}
      <Sheet
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>Veicoli {selectedItem?.fuelTypeLabel}</SheetTitle>
                <SheetDescription>
                  {selectedItem?.vehicles.length} veicoli &middot;{" "}
                  {selectedItem
                    ? formatEmission(selectedItem.emissionsKgCO2e, true)
                    : ""}
                </SheetDescription>
              </div>
              {selectedItem && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportVehicles(selectedItem)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              )}
            </div>
          </SheetHeader>
          {selectedItem && (
            <VehicleDetailTable vehicles={selectedItem.vehicles} />
          )}
        </SheetContent>
      </Sheet>

      {/* All vehicles Sheet */}
      <Sheet
        open={showAllVehicles}
        onOpenChange={(open) => {
          if (!open) {
            setShowAllVehicles(false);
            setVehicleSearch("");
          }
        }}
      >
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>Dettaglio Emissioni per Veicolo</SheetTitle>
                <SheetDescription>
                  {filteredVehicles.length === allVehicleRows.length
                    ? `${allVehicleRows.length} veicoli`
                    : `${filteredVehicles.length} di ${allVehicleRows.length} veicoli`}
                  {" "}&middot; Totale: {formatEmission(data.totals.emissions, true)}
                </SheetDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAllVehicles}
              >
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
            </div>
          </SheetHeader>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per targa, veicolo, alimentazione..."
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHead
                      label="Targa"
                      field="licensePlate"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleVehicleSort}
                    />
                  </TableHead>
                  <TableHead>Veicolo</TableHead>
                  <TableHead>
                    <SortableHead
                      label="Alim."
                      field="fuelType"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleVehicleSort}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortableHead
                      label="Km"
                      field="km"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleVehicleSort}
                      align="right"
                    />
                  </TableHead>
                  <TableHead className="text-right">Consumi</TableHead>
                  <TableHead className="text-right">
                    <SortableHead
                      label="CO2e"
                      field="emissionsKgCO2e"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleVehicleSort}
                      align="right"
                    />
                  </TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm italic text-muted-foreground">
                      Nessun veicolo trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((row) => (
                    <TableRow key={row.vehicleId}>
                      <TableCell className="font-mono text-xs">
                        {row.licensePlate}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.make} {row.model}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: row.fuelTypeColor }}
                          />
                          <span className="text-xs">{row.fuelType}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {row.km > 0 ? formatKm(row.km) : "\u2014"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {row.litres > 0 || row.kwh > 0
                          ? formatFuelConsumption(row.litres, row.kwh)
                          : "\u2014"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs font-medium">
                        {formatEmission(row.emissionsKgCO2e, true)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                        {fmtIt1.format(row.emissionsPercentage)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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

// ---------------------------------------------------------------------------
// Sortable table head button
// ---------------------------------------------------------------------------

function SortableHead({
  label,
  field,
  sortKey,
  sortDir,
  onSort,
  align,
}: {
  label: string;
  field: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "right";
}) {
  const active = sortKey === field;
  return (
    <button
      className={`flex items-center gap-1 hover:text-foreground transition-colors ${
        align === "right" ? "ml-auto" : ""
      }`}
      onClick={() => onSort(field)}
    >
      {label}
      <ArrowUpDown
        className={`size-3 ${active ? "text-foreground" : "text-muted-foreground/50"}`}
      />
    </button>
  );
}
