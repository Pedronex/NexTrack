import Link from "next/link";
import { OpenSessionButton } from "@/components/modals/modal-buttons";
import { BookCover } from "@/components/ui/book-cover";
import { ProgressBar } from "@/components/ui/progress-bar";
import { FORMAT_LABEL, progressPercent } from "@/lib/domain/books";
import type { DashboardData } from "@/lib/domain/dashboard";
import { formatDate, formatDayMonth, formatNumber } from "@/lib/format";
import type { Book } from "@/lib/types";

const byline = (book: Book) =>
  [
    book.author,
    book.format && FORMAT_LABEL[book.format].toLowerCase(),
    book.startedAt && `desde ${formatDate(book.startedAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");

function Featured({ book, lastNote }: { book: Book; lastNote: DashboardData["lastNote"] }) {
  const percent = progressPercent(book);
  return (
    <div className="flex gap-7">
      <BookCover title={book.title} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-[30px] leading-tight font-medium tracking-[-0.3px]">{book.title}</h3>
          <p className="text-[13px] text-text-secondary">{byline(book)}</p>
        </div>
        {book.totalPages && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[13px]">
              <span>
                Página {formatNumber(book.currentPage ?? 0)} de {formatNumber(book.totalPages)}
              </span>
              <span className="text-text-secondary">{percent}%</span>
            </div>
            <ProgressBar value={percent} size="sm" />
          </div>
        )}
        {lastNote && (
          <p className="font-display text-sm text-text-secondary">
            “{lastNote.text}” — nota de {formatDayMonth(lastNote.day)}
          </p>
        )}
        <div className="flex items-center gap-4 pt-1">
          <OpenSessionButton bookId={book.id} size="sm">
            Registrar sessão
          </OpenSessionButton>
          <Link href={`/biblioteca/${book.id}`} className="text-[13px] text-text-secondary hover:text-text-primary">
            Abrir livro
          </Link>
        </div>
      </div>
    </div>
  );
}

function OtherRow({ book }: { book: Book }) {
  return (
    <li className="flex items-center gap-4 border-b border-border py-3.5">
      <BookCover title={book.title} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link href={`/biblioteca/${book.id}`} className="truncate font-display text-[17px] font-medium hover:underline">
          {book.title}
        </Link>
        <p className="truncate text-xs text-text-secondary">
          {[book.author, book.format && FORMAT_LABEL[book.format].toLowerCase()].filter(Boolean).join(" · ")}
        </p>
      </div>
      {book.totalPages && (
        <div className="flex w-[120px] flex-col items-end gap-1.5">
          <span className="text-xs text-text-secondary">
            pág. {book.currentPage ?? 0} de {book.totalPages}
          </span>
          <ProgressBar value={progressPercent(book)} size="sm" />
        </div>
      )}
      <OpenSessionButton bookId={book.id} variant="ghost" size="sm">
        Registrar
      </OpenSessionButton>
    </li>
  );
}

export function ReadingNow({ data }: { data: DashboardData }) {
  const [featured, ...others] = data.reading;
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5">
      <div className="flex items-end justify-between">
        <h2 className="font-display text-[22px] font-medium">Lendo agora</h2>
        <Link href="/biblioteca?status=Lendo" className="text-[13px] text-text-secondary hover:text-text-primary">
          Biblioteca
        </Link>
      </div>
      {featured ? (
        <>
          <Featured book={featured.book} lastNote={data.lastNote} />
          {others.length > 0 && (
            <ul className="border-t border-border">
              {others.map(({ book }) => (
                <OtherRow key={book.id} book={book} />
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-sm text-text-secondary">
          Nenhum livro em andamento. Marque um livro como “Lendo” para acompanhá-lo aqui.
        </p>
      )}
    </section>
  );
}
