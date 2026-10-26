import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { DashboardData } from "@/lib/domain/dashboard";
import { formatDate, formatDayMonth } from "@/lib/format";

const barStyle = (value: number, top: number) => ({ "--v": `${(value / top) * 100}%` }) as CSSProperties;

export function PagesPerDay({ chart }: { chart: DashboardData["pagesPerDay"] }) {
  const { days, ticks, top, average, todayPages, subtitle } = chart;
  const xLabels = [0, 7, 14, 21, days.length - 1].map((i) => days[i]);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-[22px]">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[22px] font-medium">Páginas por dia</h2>
        <p className="text-[13px] text-text-secondary">{subtitle}</p>
      </div>
      <div className="flex gap-2.5">
        <div className="flex h-[180px] w-6 flex-col items-end justify-between text-[11px] text-text-tertiary">
          {ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative h-[180px]">
            <div className="absolute inset-x-0 bottom-0 h-px bg-border-strong" />
            <div className="absolute inset-x-0 bottom-0 flex h-[168px] items-end gap-1">
              {days.map(({ day, pages, isToday }) => (
                <div
                  key={day}
                  title={`${formatDate(day)}: ${pages} páginas`}
                  style={barStyle(pages, top)}
                  className={cn(
                    "min-h-0.5 flex-1 rounded-t-[1px]",
                    pages === 0 ? "h-0.5 bg-heat-1" : "h-(--v)",
                    pages > 0 && (isToday ? "bg-chart-ink" : "bg-accent-soft"),
                  )}
                />
              ))}
            </div>
            {average > 0 && (
              <div style={barStyle(average, top)} className="absolute inset-x-0 bottom-(--v) flex items-center">
                <div className="h-px flex-1 bg-chart-ink" />
                <span className="absolute left-0 -translate-y-3.5 bg-bg px-1.5 py-0.5 text-[11px] text-text-secondary">
                  média {average}
                </span>
              </div>
            )}
            {todayPages > 0 && (
              <span className="absolute top-0 right-0 text-[11px] font-semibold">hoje, {todayPages}</span>
            )}
          </div>
          <div className="flex justify-between text-[11px] text-text-tertiary">
            {xLabels.map(({ day }) => (
              <span key={day}>{formatDayMonth(day)}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MinutesPerWeek({ chart }: { chart: DashboardData["minutesPerWeek"] }) {
  return (
    <section className="flex w-full flex-col gap-[22px] xl:w-[300px] xl:shrink-0">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[22px] font-medium">Minutos por semana</h2>
        <p className="text-[13px] text-text-secondary">{chart.subtitle}</p>
      </div>
      <ul className="flex flex-col gap-[7px]">
        {chart.weeks.map(({ start, minutes, current }) => (
          <li key={start} className="flex items-center gap-2.5 text-[11px]">
            <span className="w-[34px] text-text-tertiary">{formatDayMonth(start)}</span>
            <div className="flex-1">
              <div
                style={{ "--w": `${(minutes / chart.top) * 100}%` } as CSSProperties}
                className={cn("h-2.5 w-(--w) rounded-[1px]", current ? "bg-chart-ink" : "bg-accent-soft")}
              />
            </div>
            <span className={current ? "text-text-primary" : "text-text-secondary"}>
              {minutes}
              {current && " (em curso)"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
