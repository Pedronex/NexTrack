import { Notebook, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { OpenSessionButton } from "@/components/modals/modal-buttons";
import { ExportCsvButton } from "@/components/ui/export-csv-button";
import { Skeleton, StateMessage } from "@/components/ui/states";
import { getAllBooks } from "@/lib/api/books";
import { getAllSessions } from "@/lib/api/sessions";
import { dayOf, groupByWeek, pagesOf } from "@/lib/domain/sessions";
import { formatDate, formatHours, formatMonthYear, monthName, plural } from "@/lib/format";
import { getToday } from "@/lib/today";
import { SessionsFilters } from "@/features/sessions/filters";
import { SESSIONS_PAGE_SIZE, parseSessionsParams, sessionsHref } from "@/features/sessions/params";
import { SessionsTable } from "@/features/sessions/sessions-table";

export const metadata: Metadata = { title: "Sessões" };

export default function SessionsPage({ searchParams }: PageProps<"/sessoes">) {
  return (
    <Suspense
      fallback={
        <>
          <TopBar eyebrow="Carregando…" title="Sessões" />
          <div className="flex flex-col gap-8 px-4 sm:px-6 lg:px-10 pt-2 pb-14" aria-busy>
            <Skeleton className="h-9 max-w-xl" />
            <Skeleton className="h-[420px]" />
          </div>
        </>
      }
    >
      <Sessions searchParams={searchParams} />
    </Suspense>
  );
}

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

async function Sessions({ searchParams }: Pick<PageProps<"/sessoes">, "searchParams">) {
  const today = await getToday();
  const currentMonth = today.slice(0, 7);
  const params = parseSessionsParams(await searchParams, currentMonth);
  const [books, sessions] = await Promise.all([getAllBooks(), getAllSessions()]);
  const bookById = new Map(books.map((b) => [b.id, b]));

  const text = params.q ? normalize(params.q) : "";
  const matches = sessions
    .filter((s) => dayOf(s))
    .filter(
      (s) =>
        (params.month === "todos" || dayOf(s)!.startsWith(params.month)) &&
        (!params.bookId || s.bookId === params.bookId) &&
        (!text || normalize(`${s.title} ${s.notes ?? ""}`).includes(text)),
    );

  const months = [...new Set([currentMonth, ...sessions.flatMap((s) => (dayOf(s) ? [dayOf(s)!.slice(0, 7)] : []))])]
    .sort()
    .reverse()
    .map((value) => ({ value, label: formatMonthYear(`${value}-01`) }));

  const minutes = matches.reduce((sum, s) => sum + (s.durationMin ?? 0), 0);
  const periodLabel = params.month === "todos" ? "no total" : `em ${monthName(`${params.month}-01`)}`;
  const topBar = (
    <TopBar
      eyebrow={`${matches.length} ${plural(matches.length, "sessão", "sessões")} ${periodLabel} · ${formatHours(minutes, true)}`}
      title="Sessões"
    />
  );

  if (sessions.length === 0) {
    return (
      <>
        {topBar}
        <StateMessage
          icon={Notebook}
          title="Nenhuma sessão registrada ainda"
          description="Registre quanto leu hoje — página inicial, final e tempo. O progresso do livro é atualizado sozinho."
          actions={<OpenSessionButton>Registrar sessão</OpenSessionButton>}
        />
      </>
    );
  }

  const ordered = matches.toSorted((a, b) => dayOf(b)!.localeCompare(dayOf(a)!));
  const visible = ordered.slice(0, params.limit);
  const groups = groupByWeek(visible, today);

  return (
    <>
      {topBar}
      <div className="flex flex-col gap-8 px-4 sm:px-6 lg:px-10 pt-2 pb-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SessionsFilters
            params={params}
            currentMonth={currentMonth}
            months={months}
            books={books.map((b) => ({ value: b.id, label: b.title }))}
          />
          {matches.length > 0 && (
            <ExportCsvButton
              filename="sessoes.csv"
              header={["Data", "Sessão", "Livro", "Página inicial", "Página final", "Páginas lidas", "Duração (min)", "Notas"]}
              rows={ordered.map((s) => [
                formatDate(dayOf(s)!),
                s.title,
                (s.bookId && bookById.get(s.bookId)?.title) || "",
                s.startPage,
                s.endPage,
                pagesOf(s),
                s.durationMin,
                s.notes,
              ])}
            />
          )}
        </div>

        {matches.length === 0 ? (
          <StateMessage
            icon={SearchX}
            title="Nenhuma sessão encontrada"
            description="Nada bate com esses filtros. Escolha outro período ou limpe a busca."
            actions={
              <Link href="/sessoes?periodo=todos" className="text-[13px] font-medium underline underline-offset-2">
                Ver todos os períodos
              </Link>
            }
          />
        ) : (
          <>
            <SessionsTable groups={groups} bookById={bookById} />
            {visible.length < matches.length && (
              <Link
                href={sessionsHref(params, currentMonth, { limit: params.limit + SESSIONS_PAGE_SIZE })}
                scroll={false}
                className="self-center text-[13px] font-medium text-text-secondary hover:text-text-primary"
              >
                Carregar mais sessões ({matches.length - visible.length} restantes)
              </Link>
            )}
          </>
        )}
      </div>
    </>
  );
}
