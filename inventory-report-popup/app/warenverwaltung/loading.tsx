import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-primary shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48 bg-primary-foreground/20" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 bg-primary-foreground/20" />
              <Skeleton className="h-9 w-28 bg-primary-foreground/20" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </main>
    </div>
  )
}
