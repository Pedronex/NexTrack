import { TopBar } from "@/components/layout/top-bar";
import { Skeleton } from "@/components/ui/states";

export function DashboardSkeleton() {
  return (
    <>
      <TopBar eyebrow="Carregando…" title="Seu mês, até aqui" />
      <div className="flex flex-col gap-11 px-10 pt-1 pb-16" aria-busy>
        <Skeleton className="h-16 max-w-[760px]" />
        <Skeleton className="h-[120px]" />
        <div className="flex gap-14">
          <Skeleton className="h-[280px] flex-1" />
          <Skeleton className="hidden h-[280px] w-[380px] xl:block" />
        </div>
        <Skeleton className="h-[220px]" />
      </div>
    </>
  );
}
