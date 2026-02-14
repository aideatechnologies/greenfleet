import { Skeleton } from "@/components/ui/skeleton";

export default function CarlistLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      {/* Filters skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64" />
      </div>
      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="space-y-0">
          <Skeleton className="h-12 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
