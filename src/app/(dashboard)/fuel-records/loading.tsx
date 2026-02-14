import { Skeleton } from "@/components/ui/skeleton";

export default function FuelRecordsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>
      {/* Filters skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-[180px]" />
      </div>
      {/* Feed skeleton */}
      <div className="space-y-6">
        {/* Date group 1 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        {/* Date group 2 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
