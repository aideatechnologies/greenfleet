"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { Building2, List, Car } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { DrillDownList } from "./DrillDownList";
import { VehicleEmissionDetailView } from "./VehicleEmissionDetail";
import { drillDown, getVehicleDetailAction } from "../actions/drill-down";
import type {
  DrillDownLevel,
  DrillDownResult,
  DrillDownItem,
  VehicleEmissionDetail,
} from "@/types/report";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BreadcrumbEntry = {
  level: DrillDownLevel;
  label: string;
  id: string | null;
  icon: typeof Building2;
};

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DrillDownSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DrillDownNavigatorProps {
  startDate: string;
  endDate: string;
}

export function DrillDownNavigator({
  startDate,
  endDate,
}: DrillDownNavigatorProps) {
  const [isPending, startTransition] = useTransition();
  const [drillDownData, setDrillDownData] = useState<DrillDownResult | null>(
    null
  );
  const [vehicleDetail, setVehicleDetail] =
    useState<VehicleEmissionDetail | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load fleet overview (entry point)
  const loadFleetOverview = useCallback(() => {
    setError(null);
    setVehicleDetail(null);
    startTransition(async () => {
      const result = await drillDown("FLEET", null, startDate, endDate);
      if (result.success) {
        setDrillDownData(result.data);
        setBreadcrumbs([
          {
            level: "FLEET",
            label: "Flotta",
            id: null,
            icon: Building2,
          },
        ]);
        setIsInitialized(true);
      } else {
        setError(result.error);
      }
    });
  }, [startDate, endDate]);

  // Navigate to carlist detail
  const navigateToCarlist = useCallback(
    (item: DrillDownItem) => {
      setError(null);
      setVehicleDetail(null);
      startTransition(async () => {
        const result = await drillDown(
          "CARLIST",
          item.id,
          startDate,
          endDate
        );
        if (result.success) {
          setDrillDownData(result.data);
          setBreadcrumbs((prev) => [
            ...prev.filter((b) => b.level === "FLEET"),
            {
              level: "CARLIST",
              label: item.label,
              id: item.id,
              icon: List,
            },
          ]);
        } else {
          setError(result.error);
        }
      });
    },
    [startDate, endDate]
  );

  // Navigate to vehicle detail
  const navigateToVehicle = useCallback(
    (item: DrillDownItem) => {
      setError(null);
      startTransition(async () => {
        const result = await getVehicleDetailAction(
          item.id,
          startDate,
          endDate
        );
        if (result.success) {
          setVehicleDetail(result.data);
          setDrillDownData(null);
          setBreadcrumbs((prev) => [
            ...prev.filter(
              (b) => b.level === "FLEET" || b.level === "CARLIST"
            ),
            {
              level: "VEHICLE",
              label: item.label,
              id: item.id,
              icon: Car,
            },
          ]);
        } else {
          setError(result.error);
        }
      });
    },
    [startDate, endDate]
  );

  // Handle item click based on current level
  const handleItemClick = useCallback(
    (item: DrillDownItem) => {
      if (!drillDownData) return;

      if (drillDownData.level === "FLEET") {
        navigateToCarlist(item);
      } else if (drillDownData.level === "CARLIST") {
        navigateToVehicle(item);
      }
    },
    [drillDownData, navigateToCarlist, navigateToVehicle]
  );

  // Navigate via breadcrumb
  const navigateToBreadcrumb = useCallback(
    (entry: BreadcrumbEntry) => {
      setError(null);
      setVehicleDetail(null);

      if (entry.level === "FLEET") {
        startTransition(async () => {
          const result = await drillDown("FLEET", null, startDate, endDate);
          if (result.success) {
            setDrillDownData(result.data);
            setBreadcrumbs([
              {
                level: "FLEET",
                label: "Flotta",
                id: null,
                icon: Building2,
              },
            ]);
          } else {
            setError(result.error);
          }
        });
      } else if (entry.level === "CARLIST" && entry.id) {
        startTransition(async () => {
          const result = await drillDown(
            "CARLIST",
            entry.id,
            startDate,
            endDate
          );
          if (result.success) {
            setDrillDownData(result.data);
            setBreadcrumbs((prev) =>
              prev.filter(
                (b) => b.level === "FLEET" || b.level === "CARLIST"
              )
            );
          } else {
            setError(result.error);
          }
        });
      }
    },
    [startDate, endDate]
  );

  // Initial load
  useEffect(() => {
    if (!isInitialized) {
      loadFleetOverview();
    }
  }, [isInitialized, loadFleetOverview]);

  // Determine current level label for description
  const currentLevel = breadcrumbs[breadcrumbs.length - 1];
  const levelLabels: Record<DrillDownLevel, string> = {
    FLEET: "Panoramica per carlist",
    CARLIST: "Dettaglio veicoli nella carlist",
    VEHICLE: "Dettaglio emissioni veicolo",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drill-Down Emissioni</CardTitle>
        <CardDescription>
          {currentLevel
            ? levelLabels[currentLevel.level]
            : "Caricamento dati..."}
        </CardDescription>

        {/* Breadcrumb navigation */}
        {breadcrumbs.length > 0 && (
          <Breadcrumb className="mt-2">
            <BreadcrumbList>
              {breadcrumbs.map((entry, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                const Icon = entry.icon;

                return (
                  <BreadcrumbItem key={`${entry.level}-${entry.id ?? "root"}`}>
                    {idx > 0 && <BreadcrumbSeparator />}
                    {isLast ? (
                      <BreadcrumbPage className="flex items-center gap-1.5">
                        <Icon className="size-3.5" />
                        {entry.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        className="flex cursor-pointer items-center gap-1.5"
                        onClick={() => navigateToBreadcrumb(entry)}
                      >
                        <Icon className="size-3.5" />
                        {entry.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </CardHeader>
      <CardContent>
        {/* Error state */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Loading state */}
        {isPending && <DrillDownSkeleton />}

        {/* DrillDown list (FLEET or CARLIST level) */}
        {!isPending && drillDownData && (
          <DrillDownList
            items={drillDownData.items}
            level={drillDownData.level}
            onItemClick={handleItemClick}
          />
        )}

        {/* Vehicle detail */}
        {!isPending && vehicleDetail && (
          <VehicleEmissionDetailView detail={vehicleDetail} />
        )}
      </CardContent>
    </Card>
  );
}
