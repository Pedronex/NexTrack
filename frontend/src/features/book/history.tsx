import { Music, Notebook } from "lucide-react";
import { ExportCsvButton } from "@/components/ui/export-csv-button";
import { SectionHead } from "@/components/ui/section-head";
import { StateMessage } from "@/components/ui/states";
import { type BookStats, dayOf, pagesOf } from "@/lib/domain/sessions";
import { formatDate, formatDateShort, formatHours, formatNumber, plural } from "@/lib/format";
import type { Book } from "@/lib/types";

export function History({ book, stats }: { book: Book; stats: BookStats }) {
  const { sessions } = stats;

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3.5">
      <SectionHead
        title="Histórico de sessões"
        subtitle={
          sessions.length === 0
            ? undefined
            : `${sessions.length} ${plural(sessions.length, "sessão", "sessões")} · ${formatNumber(stats.pages)} páginas · ${formatHours(stats.minutes)}`
        }
        action={
          sessions.length > 0 && (
            <ExportCsvButton
              filename={`sessoes-${book.title.toLowerCase().replaceAll(/\W+/g, "-")}.csv`}
              header={["Data", "Sessão", "Página inicial", "Página final", "Páginas lidas", "Duração (min)", "Notas"]}
              rows={sessions.map((s) => [
                dayOf(s) ? formatDate(dayOf(s)!) : "",
                s.title,
                s.startPage,
                s.endPage,
                pagesOf(s),
                s.durationMin,
                s.notes,
              ])}
            />
          )
        }
      />
      {sessions.length === 0 ? (
        <StateMessage
          icon={Notebook}
          title="Nenhuma sessão para este livro"
          description="O histórico e o gráfico de evolução aparecem a partir da primeira sessão."
          className="rounded border border-border bg-surface"
        />
      ) : (
        <div className="relative overflow-x-auto rounded border border-border bg-surface">
          <table className="w-full min-w-[520px] text-left">
            <thead className="bg-surface-muted">
              <tr className="border-b border-border text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
                <th scope="col" className="px-5 py-2.5">Data</th>
                <th scope="col" className="px-4 py-2.5">Sessão</th>
                <th scope="col" className="px-4 py-2.5">Páginas</th>
                <th scope="col" className="px-4 py-2.5">Lidas</th>
                <th scope="col" className="w-10 px-4 py-2.5"><span className="sr-only">Música</span></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3 text-[13px] whitespace-nowrap text-text-secondary">
                    {dayOf(s) ? formatDateShort(dayOf(s)!) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{s.title}</p>
                    {s.notes && <p className="text-xs text-text-secondary">“{s.notes}”</p>}
                  </td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap text-text-secondary">
                    {s.startPage != null && s.endPage != null ? `${s.startPage} → ${s.endPage}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold">+{pagesOf(s)}</td>
                  <td className="px-4 py-3">
                    {s.spotifyUrl && (
                      <a href={s.spotifyUrl} target="_blank" rel="noreferrer" aria-label="Abrir música no Spotify">
                        <Music size={14} className="text-spotify" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
