import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Day } from "@/lib/dates";
import { PERIOD_KINDS, type Period, type PeriodKind } from "@/lib/domain/reports";
import { CompareToggle, CustomRange, ExportMenu } from "./period-controls";
import { type ReportParams, reportHref } from "./params";

interface PeriodBarProps {
  params: ReportParams;
  period: Period;
  today: Day;
  previousLabel: string;
  exportRows: { header: string[]; rows: (string | number | null)[][]; filename: string };
}

const navButton =
  "flex size-8 items-center justify-center rounded-[5px] border border-border bg-surface text-text-secondary";

export function PeriodBar({ params, period, today, previousLabel, exportRows }: PeriodBarProps) {
  const href = (patch: Partial<ReportParams>) => reportHref(params, today, patch);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="tablist" aria-label="Tipo de período" className="flex gap-0.5 rounded-[5px] bg-surface-muted p-[3px]">
        {(Object.keys(PERIOD_KINDS) as PeriodKind[]).map((kind) => (
          <Link
            key={kind}
            role="tab"
            aria-selected={params.kind === kind}
            href={href({ kind, ref: today })}
            className={cn(
              "rounded-[7px] px-3.5 py-[7px] text-[13px] font-medium",
              params.kind === kind ? "bg-surface text-text-primary" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {PERIOD_KINDS[kind]}
          </Link>
        ))}
      </div>

      {params.kind === "personalizado" ? (
        <CustomRange from={params.from} to={params.to} />
      ) : (
        <div className="flex items-center gap-1 pl-2">
          <Link href={href({ ref: period.prevRef ?? params.ref })} aria-label="Período anterior" className={navButton}>
            <ChevronLeft size={15} />
          </Link>
          <p className="flex items-center gap-2 px-2.5">
            <Calendar size={15} className="text-text-tertiary" />
            <span className="text-sm font-semibold">{period.label}</span>
            <span className="text-[13px] text-text-tertiary">{period.range}</span>
          </p>
          <Link href={href({ ref: period.nextRef ?? params.ref })} aria-label="Próximo período" className={navButton}>
            <ChevronRight size={15} />
          </Link>
        </div>
      )}

      <span className="flex-1" />
      <CompareToggle enabled={params.compare} href={href({ compare: !params.compare })} label={`Comparar com ${previousLabel}`} />
      <ExportMenu {...exportRows} />
    </div>
  );
}
