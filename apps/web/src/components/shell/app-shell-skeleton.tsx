import { SidebarMarca } from "@/components/brand/sidebar-marca";
import { Skeleton } from "@/components/ui/skeleton";

export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[272px_1fr]">
      <aside className="hidden bg-awning md:flex md:flex-col">
        <SidebarMarca />
        <div className="flex flex-1 flex-col gap-1 px-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 bg-white/20" />
          ))}
        </div>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="page-gutter flex h-[60px] items-center justify-between border-b border-border bg-sheet py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="hidden h-4 w-40 md:block" />
        </header>
        <main className="page-gutter flex-1 py-6 md:py-8">
          <div className="w-full space-y-8">
            <div className="space-y-3">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="space-y-2 rounded-md bg-sheet p-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
