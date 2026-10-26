import { cn } from "@/lib/cn";
import type { DashboardData } from "@/lib/domain/dashboard";
import { formatNumber } from "@/lib/format";

interface FigureProps {
  label: string;
  value: string | number;
  note: string;
  className?: string;
}

function Figure({ label, value, note, className }: FigureProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 px-6 pt-5 pb-[22px]", className)}>
      <p className="text-[13px] text-text-secondary">{label}</p>
      <p className="font-display text-[44px] leading-none tracking-[-1px] text-text-primary">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="text-xs text-text-tertiary">{note}</p>
    </div>
  );
}

export function Figures({ data }: { data: DashboardData }) {
  const { finishedThisYear, pages, time, average, streak } = data.figures;
  return (
    <section
      aria-label={`Números de ${data.month}`}
      className="grid grid-cols-2 border-y border-border-strong md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_1fr_250px] [&>*]:border-border xl:[&>*]:border-l xl:[&>*:first-child]:border-l-0"
    >
      <Figure
        label={`Livros concluídos em ${data.year}`}
        value={finishedThisYear.value}
        note={finishedThisYear.note}
        className="xl:pl-0"
      />
      <Figure label={`Páginas em ${data.month}`} value={pages.value} note={pages.note} />
      <Figure label={`Tempo lendo em ${data.month}`} value={time.value} note={time.note} />
      <Figure label="Média por sessão" value={average.value} note={average.note} />
      <div className="flex flex-col gap-1.5 px-6 pt-5 pb-[22px] xl:pr-0">
        <p className="text-[13px] text-text-secondary">Sequência atual</p>
        <p className="flex items-end gap-1.5">
          <span className="font-display text-[44px] leading-none tracking-[-1px] text-text-primary">
            {streak.value}
          </span>
          <span className="pb-1 text-[13px] text-text-secondary">dias seguidos</span>
        </p>
        <div className="flex gap-[3px] pt-1" role="img" aria-label="Últimos 21 dias de leitura">
          {streak.last21.map(({ day, read }, index) => (
            <span
              key={day}
              title={day}
              className={cn(
                "size-[7px] rounded-[1px]",
                !read ? "bg-heat-0" : index >= 21 - streak.value ? "bg-chart-ink" : "bg-heat-2",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
