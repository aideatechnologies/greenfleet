import { VehicleHeaderSkeleton } from "@/components/data-display/VehicleHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DriverDashboardLoading() {
  return (
    <div className="space-y-6 pb-16 md:pb-0">
      {/* Title skeleton */}
      <Skeleton className="h-8 w-56" />

      {/* Vehicle header skeleton */}
      <VehicleHeaderSkeleton />

      {/* KPI cards skeleton — 3 columns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="mt-1 h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documents + Contract skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
