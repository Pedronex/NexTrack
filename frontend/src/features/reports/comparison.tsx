import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { ReportData } from "@/lib/domain/reports";
import { formatDate, formatHours, formatNumber } from "@/lib/format";
import { diffDays } from "@/lib/dates";

interface RowProps {
  label: string;
  current: number;
  previous: number;
  format: (value: number) => string;
}

function ComparisonRow({ label, current, previous, format }: RowProps) {
  const max = Math.max(current, previous, 1);
  const pct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  const bar = (value: number, className: string) => (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div style={{ "--w": `${(value / max) * 100}%` } as CSSProperties} className={cn("h-2 w-(--w) rounded-full", className)} />
      </div>
      <span className="w-14 text-right text-[11px] text-text-secondary">{format(value)}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between">
        <span className="text-[13px] font-medium">{label}</span>
        {pct !== null && (
          <span className={cn("text-xs font-semibold", pct >= 0 ? "text-done-fg" : "text-drop-fg")}>
            {pct >= 0 ? "↑" : "↓"} {Math.abs(pct)}%
          </span>
        )}
      </div>
      {bar(current, "bg-chart-ink")}
      {bar(previous, "bg-border-strong")}
    </div>
  );
}

export function Comparison({ report, currentLabel }: { report: ReportData; currentLabel: string }) {
  const { period, current, previous } = report;
  const span = diffDays(period.from, period.effectiveTo) + 1;

  return (
    <section className="flex w-full flex-col gap-5 border-t border-border-strong pt-6 xl:w-[380px] xl:shrink-0">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-lg font-medium">
          {currentLabel} vs. {period.previous.label}
        </h2>
        <p className="text-[13px] text-text-secondary">
          Mesmo intervalo de dias ({span} {span === 1 ? "dia" : "dias"}: {formatDate(period.from).slice(0, 5)} a{" "}
          {formatDate(period.effectiveTo).slice(0, 5)})
        </p>
      </div>
      <div className="flex gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-ink" />
          {currentLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-border-strong" />
          {period.previous.label}
        </span>
      </div>
      <ComparisonRow label="Páginas" current={current.pages} previous={previous.pages} format={formatNumber} />
      <ComparisonRow
        label="Horas"
        current={current.minutes}
        previous={previous.minutes}
        format={(value) => formatHours(value, true)}
      />
    </section>
  );
}
