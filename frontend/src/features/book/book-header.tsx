import { BookCover } from "@/components/ui/book-cover";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { FORMAT_LABEL, pagesLeft, progressPercent } from "@/lib/domain/books";
import type { BookStats } from "@/lib/domain/sessions";
import { formatDate, formatNumber } from "@/lib/format";
import type { Book } from "@/lib/types";
import { BookActions } from "./book-actions";

function Meta({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className={value ? "text-sm font-medium" : "text-sm font-medium text-text-tertiary"}>{value ?? "—"}</dd>
    </div>
  );
}

export function BookHeader({ book, stats }: { book: Book; stats: BookStats }) {
  const percent = progressPercent(book);
  const left = pagesLeft(book);

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-8 rounded border border-border bg-surface p-7 md:flex-row">
      <BookCover title={book.title} size="xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <StatusBadge status={book.status} />
            {book.format && <span className="text-xs font-medium text-text-secondary">{FORMAT_LABEL[book.format]}</span>}
          </div>
          <h2 className="font-display text-4xl leading-tight font-medium">{book.title}</h2>
          {book.author && <p className="text-base text-text-secondary">{book.author}</p>}
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-3">
          <Meta label="Páginas" value={book.totalPages ? formatNumber(book.totalPages) : null} />
          <Meta label="Início" value={book.startedAt ? formatDate(book.startedAt) : null} />
          <Meta label="Conclusão" value={book.finishedAt ? formatDate(book.finishedAt) : null} />
          <Meta label="ISBN" value={book.isbn} />
        </dl>

        {book.totalPages && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="flex items-end gap-1.5">
                <span className="font-display text-[26px] leading-none font-medium">{percent}%</span>
                <span className="text-[13px] text-text-secondary">
                  {formatNumber(book.currentPage ?? 0)} de {formatNumber(book.totalPages)} páginas
                </span>
              </p>
              {left > 0 && (
                <p className="text-[13px] text-text-tertiary">
                  {formatNumber(left)} restantes
                  {stats.sessionsLeft ? ` · ~${stats.sessionsLeft} ${stats.sessionsLeft === 1 ? "sessão" : "sessões"}` : ""}
                </p>
              )}
            </div>
            <ProgressBar value={percent} tone="accent" size="lg" />
          </div>
        )}

        <BookActions book={book} />
      </div>
    </section>
  );
}
