import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard loading skeleton - matches the FM dashboard layout:
 * - Welcome header
 * - 4 KPI cards (1 hero + 3 default)
 * - DeltaBar card (full width)
 * - ProgressTarget + Notifications (2 columns)
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Welcome header skeleton */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>

      {/* KPI row: 1 hero + 3 default */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Hero card */}
        <Card className="py-5">
          <CardContent className="space-y-3 px-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-10 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-2 h-12 w-full" />
          </CardContent>
        </Card>
        {/* 3 default cards */}
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="py-4">
            <CardContent className="space-y-2 px-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DeltaBar card (full width) */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-16" />
          </div>
        </CardContent>
      </Card>

      {/* ProgressTarget + Notifications */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ProgressTarget skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-5 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
