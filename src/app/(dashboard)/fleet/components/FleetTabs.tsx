"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Car, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FleetVehicleTable } from "./FleetVehicleTable";
import { FleetEmployeeTable } from "./FleetEmployeeTable";
import type { PaginatedResult } from "@/types/pagination";
import type {
  FleetVehicleOverview,
  FleetEmployeeOverview,
} from "@/types/fleet-overview";

interface FleetTabsProps {
  activeTab: string;
  vehicleResult: PaginatedResult<FleetVehicleOverview>;
  employeeResult: PaginatedResult<FleetEmployeeOverview>;
}

export function FleetTabs({
  activeTab,
  vehicleResult,
  employeeResult,
}: FleetTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "vehicles") {
        params.delete("tab");
      } else {
        params.set("tab", value);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router]
  );

  return (
    <Tabs
      value={activeTab === "employees" ? "employees" : "vehicles"}
      onValueChange={handleTabChange}
    >
      <TabsList>
        <TabsTrigger value="vehicles" className="gap-1.5">
          <Car className="h-4 w-4" />
          Veicoli
        </TabsTrigger>
        <TabsTrigger value="employees" className="gap-1.5">
          <Users className="h-4 w-4" />
          Dipendenti
        </TabsTrigger>
      </TabsList>

      <TabsContent value="vehicles">
        <FleetVehicleTable
          vehicles={vehicleResult.data}
          pagination={vehicleResult.pagination}
        />
      </TabsContent>

      <TabsContent value="employees">
        <FleetEmployeeTable
          employees={employeeResult.data}
          pagination={employeeResult.pagination}
        />
      </TabsContent>
    </Tabs>
  );
}
