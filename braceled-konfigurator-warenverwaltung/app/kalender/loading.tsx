import { Skeleton } from "@/components/ui/skeleton"

export default function KalenderLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-primary shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-28 bg-primary-foreground/20" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-56 bg-primary-foreground/20" />
              <Skeleton className="h-4 w-36 bg-primary-foreground/20" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <Skeleton className="h-[600px] rounded-xl" />
      </main>
    </div>
  )
}
