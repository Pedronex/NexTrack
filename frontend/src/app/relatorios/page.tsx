import { CalendarX } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { OpenSessionButton } from "@/components/modals/modal-buttons";
import { Skeleton, StateMessage } from "@/components/ui/states";
import { getAllBooks } from "@/lib/api/books";
import { getAllSessions } from "@/lib/api/sessions";
import { buildReport, resolvePeriod } from "@/lib/domain/reports";
import { dayOf, pagesOf } from "@/lib/domain/sessions";
import { formatDate, plural } from "@/lib/format";
import { getToday } from "@/lib/today";
import { Comparison } from "@/features/reports/comparison";
import { FinishedTable } from "@/features/reports/finished-table";
import { Heatmap } from "@/features/reports/heatmap";
import { parseReportParams } from "@/features/reports/params";
import { PeriodBar } from "@/features/reports/period-bar";
import { SummaryStrip } from "@/features/reports/summary-strip";

export const metadata: Metadata = { title: "Relatórios" };

/** Acima disso o calendário vira uma grade compacta de quadradinhos. */
const COMPACT_HEATMAP_DAYS = 62;

export default function ReportsPage({ searchParams }: PageProps<"/relatorios">) {
  return (
    <Suspense
      fallback={
        <>
          <TopBar eyebrow="Análise por período" title="Relatórios" />
          <div className="flex flex-col gap-7 px-10 pt-2 pb-14" aria-busy>
            <Skeleton className="h-9 max-w-xl" />
            <Skeleton className="h-[110px]" />
            <Skeleton className="h-[360px]" />
          </div>
        </>
      }
    >
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

async function Reports({ searchParams }: Pick<PageProps<"/relatorios">, "searchParams">) {
  const today = await getToday();
  const params = parseReportParams(await searchParams, today);
  const [books, sessions] = await Promise.all([getAllBooks(), getAllSessions()]);

  const period = resolvePeriod(params.kind, params.ref, { from: params.from, to: params.to }, today);
  const report = buildReport(books, sessions, period);
  const bookById = new Map(books.map((b) => [b.id, b]));

  const periodSessions = sessions
    .filter((s) => dayOf(s) && dayOf(s)! >= period.from && dayOf(s)! <= period.to)
    .toSorted((a, b) => dayOf(a)!.localeCompare(dayOf(b)!));

  const compactHeatmap = report.heatmap.weeks.length * 7 > COMPACT_HEATMAP_DAYS;
  const finishedCount = report.finished.length;
  const finishedDiff = report.current.finished - report.previous.finished;

  return (
    <>
      <TopBar eyebrow="Análise por período" title="Relatórios" />
      <div className="flex flex-col gap-7 px-10 pt-2 pb-14">
        <PeriodBar
          params={params}
          period={period}
          today={today}
          previousLabel={period.previous.label}
          exportRows={{
            filename: `relatorio-${period.from}_${period.to}.csv`,
            header: ["Data", "Sessão", "Livro", "Página inicial", "Página final", "Páginas lidas", "Duração (min)"],
            rows: periodSessions.map((s) => [
              formatDate(dayOf(s)!),
              s.title,
              (s.bookId && bookById.get(s.bookId)?.title) || "",
              s.startPage,
              s.endPage,
              pagesOf(s),
              s.durationMin,
            ]),
          }}
        />

        {report.isEmpty ? (
          <StateMessage
            icon={CalendarX}
            title="Sem leituras neste período"
            description={`Nenhuma sessão entre ${formatDate(period.from)} e ${formatDate(period.to)}. Escolha outro período ou registre uma sessão.`}
            actions={<OpenSessionButton>Registrar sessão</OpenSessionButton>}
          />
        ) : (
          <>
            <SummaryStrip report={report} compare={params.compare} />
            <div className="flex flex-col gap-12 xl:flex-row">
              <Heatmap report={report} compact={compactHeatmap} />
              {params.compare && <Comparison report={report} currentLabel={period.label} />}
            </div>
            <FinishedTable
              rows={report.finished}
              subtitle={
                params.compare && finishedDiff !== 0
                  ? `${finishedCount} ${plural(finishedCount, "livro", "livros")} · ${Math.abs(finishedDiff)} a ${finishedDiff > 0 ? "mais" : "menos"} que em ${period.previous.label}`
                  : `${finishedCount} ${plural(finishedCount, "livro", "livros")}`
              }
            />
          </>
        )}
      </div>
    </>
  );
}
