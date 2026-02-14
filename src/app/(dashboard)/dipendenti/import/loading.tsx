import { Skeleton } from "@/components/ui/skeleton";

export default function ImportEmployeesLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      {/* Step indicator skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
      {/* Content skeleton */}
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
