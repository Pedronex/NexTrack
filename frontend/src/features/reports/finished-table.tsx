import Link from "next/link";
import { BookCover } from "@/components/ui/book-cover";
import { Rating } from "@/components/ui/rating";
import { SectionHead } from "@/components/ui/section-head";
import { FORMAT_LABEL } from "@/lib/domain/books";
import type { FinishedRow } from "@/lib/domain/reports";
import { formatDate, formatDayMonth, plural } from "@/lib/format";

const COLUMNS = ["Livro", "Formato", "Período", "Tempo até concluir", "Ritmo", "Avaliação"];

export function FinishedTable({ rows, subtitle }: { rows: FinishedRow[]; subtitle: string }) {
  return (
    <section className="flex flex-col gap-3.5">
      <SectionHead title="Livros concluídos no período" subtitle={subtitle} />
      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum livro foi concluído neste período.</p>
      ) : (
        <>
        <ul className="flex flex-col gap-3 md:hidden">
          {rows.map(({ book, start, end, days, sessions, rhythm }) => (
            <li key={book.id} className="flex flex-col gap-2.5 rounded border border-border bg-surface p-4">
              <Link href={`/biblioteca/${book.id}`} className="flex items-center gap-3">
                <BookCover title={book.title} size="md" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{book.title}</span>
                  <span className="truncate text-xs text-text-secondary">{book.author}</span>
                </span>
              </Link>
              <p className="text-[13px] text-text-secondary">
                {start ? `${formatDayMonth(start)} → ${formatDate(end)}` : formatDate(end)}
                {days != null && ` · ${days} ${plural(days, "dia", "dias")}`} · {sessions} {plural(sessions, "sessão", "sessões")}
              </p>
              <div className="flex items-center justify-between text-[13px] text-text-secondary">
                <span>
                  {[book.format && FORMAT_LABEL[book.format], rhythm && `${rhythm} págs/h`].filter(Boolean).join(" · ") || "—"}
                </span>
                <Rating value={book.rating} />
              </div>
            </li>
          ))}
        </ul>
        <div className="relative hidden overflow-x-auto rounded border border-border bg-surface md:block">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-surface-muted">
              <tr className="border-b border-border text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
                {COLUMNS.map((column) => (
                  <th key={column} scope="col" className="px-4 py-2.5 first:pl-5">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ book, start, end, days, sessions, rhythm }) => (
                <tr key={book.id} className="border-b border-border last:border-b-0">
                  <td className="py-3.5 pr-4 pl-5">
                    <Link href={`/biblioteca/${book.id}`} className="flex items-center gap-3">
                      <BookCover title={book.title} size="md" />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{book.title}</span>
                        <span className="text-xs text-text-secondary">{book.author}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 text-[13px] text-text-secondary">{book.format ? FORMAT_LABEL[book.format] : "—"}</td>
                  <td className="px-4 text-[13px] whitespace-nowrap text-text-secondary">
                    {start ? `${formatDayMonth(start)} → ${formatDate(end)}` : formatDate(end)}
                  </td>
                  <td className="px-4 text-[13px] whitespace-nowrap text-text-secondary">
                    {days != null ? `${days} ${plural(days, "dia", "dias")} · ` : ""}
                    {sessions} {plural(sessions, "sessão", "sessões")}
                  </td>
                  <td className="px-4 text-[13px] whitespace-nowrap text-text-secondary">{rhythm ? `${rhythm} págs/h` : "—"}</td>
                  <td className="px-4">
                    <Rating value={book.rating} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
