import { TopBar } from "@/components/layout/top-bar";
import { Skeleton } from "@/components/ui/states";

export function LibrarySkeleton() {
  return (
    <>
      <TopBar eyebrow="Carregando…" title="Biblioteca" />
      <div className="flex flex-col gap-8 px-4 sm:px-6 lg:px-10 pt-2 pb-14" aria-busy>
        <Skeleton className="h-[84px]" />
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[340px]" />
          ))}
        </div>
      </div>
    </>
  );
}
