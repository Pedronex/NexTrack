import { cn } from "@/lib/cn";
import type { ReportData } from "@/lib/domain/reports";
import { formatHours, formatNumber } from "@/lib/format";

interface Delta {
  text: string;
  direction: "up" | "down" | "flat";
}

const direction = (current: number, previous: number): Delta["direction"] =>
  current > previous ? "up" : current < previous ? "down" : "flat";

const arrow = { up: "↑", down: "↓", flat: "=" } as const;

const absolute = (current: number, previous: number): Delta => {
  const dir = direction(current, previous);
  return { direction: dir, text: dir === "flat" ? "=" : `${arrow[dir]} ${Math.abs(current - previous)}` };
};

const percent = (current: number, previous: number): Delta => {
  const dir = direction(current, previous);
  if (previous === 0) return { direction: dir, text: dir === "flat" ? "=" : "novo" };
  return { direction: dir, text: `${arrow[dir]} ${Math.abs(Math.round(((current - previous) / previous) * 100))}%` };
};

function Metric({ label, value, delta, previous }: { label: string; value: string; delta?: Delta; previous?: string }) {
  return (
    <div className="flex flex-col gap-2 border-border px-[22px] py-5 first:pl-0 md:border-l md:first:border-l-0">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="font-display text-[34px] leading-none">{value}</p>
      {delta && (
        <p className="flex items-center gap-1.5 text-[11px]">
          <span
            className={cn(
              "rounded-sm px-1 font-semibold",
              delta.direction === "up" && "text-done-fg",
              delta.direction === "down" && "text-drop-fg",
              delta.direction === "flat" && "text-text-tertiary",
            )}
          >
            {delta.text}
          </span>
          <span className="text-text-tertiary">{previous}</span>
        </p>
      )}
    </div>
  );
}

export function SummaryStrip({ report, compare }: { report: ReportData; compare: boolean }) {
  const { current: c, previous: p, heatmap } = report;
  const show = <T,>(value: T) => (compare ? value : undefined);

  return (
    <section
      aria-label="Resumo do período"
      className="grid grid-cols-2 border-y border-border-strong md:grid-cols-3 xl:grid-cols-6"
    >
      <Metric
        label="Livros iniciados"
        value={String(c.started)}
        delta={show(absolute(c.started, p.started))}
        previous={`vs. ${p.started}`}
      />
      <Metric
        label="Livros concluídos"
        value={String(c.finished)}
        delta={show(absolute(c.finished, p.finished))}
        previous={`vs. ${p.finished}`}
      />
      <Metric
        label="Páginas lidas"
        value={formatNumber(c.pages)}
        delta={show(percent(c.pages, p.pages))}
        previous={`vs. ${formatNumber(p.pages)}`}
      />
      <Metric
        label="Horas de leitura"
        value={formatHours(c.minutes, true)}
        delta={show(percent(c.minutes, p.minutes))}
        previous={`vs. ${formatHours(p.minutes, true)}`}
      />
      <Metric
        label="Ritmo médio"
        value={c.rhythm ? String(c.rhythm) : "—"}
        delta={show(absolute(c.rhythm ?? 0, p.rhythm ?? 0))}
        previous={`págs/hora · vs. ${p.rhythm ?? "—"}`}
      />
      <Metric
        label="Dias com leitura"
        value={String(c.daysRead)}
        delta={show(absolute(c.daysRead, p.daysRead))}
        previous={`de ${heatmap.elapsedDays} · vs. ${p.daysRead}`}
      />
    </section>
  );
}
