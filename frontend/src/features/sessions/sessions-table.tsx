import { Music } from "lucide-react";
import Link from "next/link";
import { BookCover } from "@/components/ui/book-cover";
import { type WeekGroup, dayOf, pace, pagesOf } from "@/lib/domain/sessions";
import { formatDate, plural, weekdayShort } from "@/lib/format";
import type { Book } from "@/lib/types";

const COLUMNS = ["Data", "Sessão", "Livro", "Páginas", "Lidas", "Duração", "Ritmo"];

interface SessionsTableProps {
  groups: WeekGroup[];
  bookById: Map<string, Book>;
}

export function SessionsTable({ groups, bookById }: SessionsTableProps) {
  return (
    <div className="relative overflow-x-auto rounded border border-border bg-surface">
      <table className="w-full min-w-[960px] text-left">
        <thead className="bg-surface-muted">
          <tr className="border-b border-border text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className="px-4 py-2.5 first:pl-5">
                {column}
              </th>
            ))}
            <th scope="col" className="w-12 px-4 py-2.5">
              <span className="sr-only">Música</span>
            </th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.key}>
            <tr>
              <th colSpan={COLUMNS.length + 1} scope="colgroup" className="px-5 pt-3.5 pb-2 text-left">
                <span className="mr-2.5 font-display text-base font-medium">{group.title}</span>
                <span className="text-xs font-normal text-text-tertiary">
                  {!group.title.includes(group.range) && `${group.range} · `}
                  {group.sessions.length} {plural(group.sessions.length, "sessão", "sessões")} ·{" "}
                  {group.pages} págs
                </span>
              </th>
            </tr>
            {group.sessions.map((session) => {
              const day = dayOf(session)!;
              const book = session.bookId ? bookById.get(session.bookId) : undefined;
              const pages = pagesOf(session);
              const rhythm = pace(pages, session.durationMin ?? 0);
              return (
                <tr key={session.id} className="border-t border-border">
                  <td className="py-3 pr-4 pl-5 align-top">
                    <p className="text-[13px] font-medium">{formatDate(day)}</p>
                    <p className="text-[11px] text-text-tertiary">{weekdayShort(day)}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-sm font-medium">{session.title}</p>
                    {session.notes && <p className="max-w-md text-xs text-text-secondary">“{session.notes}”</p>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {book ? (
                      <Link href={`/biblioteca/${book.id}`} className="flex items-center gap-2.5 text-[13px] text-text-secondary hover:text-text-primary">
                        <BookCover title={book.title} size="xs" />
                        {book.title}
                      </Link>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap text-text-secondary">
                    {session.startPage != null && session.endPage != null ? `${session.startPage} → ${session.endPage}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold">+{pages}</td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap text-text-secondary">
                    {session.durationMin ? `${session.durationMin} min` : "—"}
                  </td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap text-text-secondary">
                    {rhythm ? `${rhythm} p/h` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {session.spotifyUrl && (
                      <a href={session.spotifyUrl} target="_blank" rel="noreferrer" aria-label="Abrir música no Spotify">
                        <Music size={14} className="text-spotify" />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
