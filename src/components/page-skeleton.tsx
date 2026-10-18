import { Skeleton } from "@/components/ui/skeleton";

// Placeholder shown by each portal's loading.tsx. A loading file wraps the portal's pages in a Suspense
// boundary *below* the shared layout, so client navigations show this instantly while queries stream in.
export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-9 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
