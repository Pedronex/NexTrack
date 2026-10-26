import { cn } from "@/lib/cn";
import { dayOfMonth } from "@/lib/dates";
import type { HeatCell, ReportData } from "@/lib/domain/reports";
import { formatDate, plural } from "@/lib/format";

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const LEVEL_BG = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"] as const;

/** Níveis escuros precisam de texto claro. */
const darkLevel = (cell: HeatCell) => cell.level >= 3;

export function Heatmap({ report, compact }: { report: ReportData; compact: boolean }) {
  const { weeks, elapsedDays, longestStreak } = report.heatmap;
  const daysRead = report.current.daysRead;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-[18px] border-t border-border-strong pt-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-lg font-medium">Dias de leitura</h2>
          <p className="text-[13px] text-text-secondary">
            {daysRead} de {elapsedDays} {plural(elapsedDays, "dia", "dias")} até hoje · maior sequência: {longestStreak}{" "}
            {plural(longestStreak, "dia", "dias")}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-text-tertiary" aria-hidden>
          Menos
          {LEVEL_BG.map((bg) => (
            <span key={bg} className={cn("size-3 rounded-[3px]", bg)} />
          ))}
          Mais
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((label) => (
            <span key={label} className="text-center text-[10px] font-semibold text-text-tertiary">
              {label}
            </span>
          ))}
        </div>
        {weeks.map((week, index) => (
          <div key={index} className="grid grid-cols-7 gap-1.5">
            {week.map((cell, slot) =>
              cell === null ? (
                <span key={slot} className={compact ? "h-4" : "h-[62px]"} />
              ) : compact ? (
                <span
                  key={cell.day}
                  title={`${formatDate(cell.day)}: ${cell.pages} páginas`}
                  className={cn("h-4 rounded-[3px]", LEVEL_BG[cell.level])}
                />
              ) : (
                <div
                  key={cell.day}
                  className={cn("flex h-[62px] flex-col justify-between rounded-sm px-[9px] py-[7px]", LEVEL_BG[cell.level])}
                >
                  <span className={cn("text-xs font-semibold", darkLevel(cell) ? "text-white" : "text-text-primary")}>
                    {dayOfMonth(cell.day)}
                  </span>
                  <span className={cn("text-[11px]", darkLevel(cell) ? "text-white/80" : "text-text-secondary")}>
                    {cell.pages > 0 ? `${cell.pages} págs` : "—"}
                  </span>
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
