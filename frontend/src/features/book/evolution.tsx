import type { CSSProperties } from "react";
import { type BookStats, dayOf } from "@/lib/domain/sessions";
import { formatDayMonth } from "@/lib/format";
import type { Book } from "@/lib/types";

const MAX_BARS = 24;

export function Evolution({ book, stats }: { book: Book; stats: BookStats }) {
  const ordered = stats.sessions.filter((s) => s.endPage != null && dayOf(s)).toReversed().slice(-MAX_BARS);
  if (ordered.length === 0) return null;

  const top = book.totalPages ?? Math.max(...ordered.map((s) => s.endPage ?? 0));
  const ticks = [1, 0.75, 0.5, 0.25].map((fraction) => Math.round(top * fraction));

  return (
    <aside className="flex w-full flex-col gap-[18px] border-t border-border-strong pt-6 xl:w-[340px] xl:shrink-0">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-lg font-medium">Evolução de páginas</h2>
        <p className="text-[13px] text-text-secondary">Página atual após cada sessão</p>
      </div>

      <div className="flex gap-2">
        <div className="flex h-[168px] w-6 flex-col justify-between text-[10px] text-text-tertiary">
          {ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="relative h-[168px]">
            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
              {ticks.map((tick) => (
                <div key={tick} className="h-px bg-border" />
              ))}
            </div>
            <div className="absolute inset-0 flex items-end gap-1.5">
              {ordered.map((s) => (
                <div
                  key={s.id}
                  title={`${formatDayMonth(dayOf(s)!)}: pág. ${s.endPage}`}
                  style={{ "--v": `${Math.min(100, ((s.endPage ?? 0) / top) * 100)}%` } as CSSProperties}
                  className="h-(--v) min-h-px flex-1 rounded-t-[3px] bg-accent-soft"
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-text-tertiary">
            <span>{formatDayMonth(dayOf(ordered[0])!)}</span>
            <span>{formatDayMonth(dayOf(ordered.at(-1)!)!)}</span>
          </div>
        </div>
      </div>

      <dl className="flex gap-3">
        <Stat label="Ritmo" value={stats.pace ? `${stats.pace} págs/h` : "—"} />
        <Stat label="Média/sessão" value={`${stats.avgPerSession} págs`} />
        <Stat label="Previsão" value={stats.forecast ? `~${formatDayMonth(stats.forecast)}` : "—"} />
      </dl>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <dt className="text-[11px] text-text-tertiary">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}
