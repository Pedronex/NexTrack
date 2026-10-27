import Link from "next/link";
import { BookCover } from "@/components/ui/book-cover";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Rating } from "@/components/ui/rating";
import { StatusBadge } from "@/components/ui/status-badge";
import { FORMAT_LABEL, progressPercent, toneOf } from "@/lib/domain/books";
import { formatDate } from "@/lib/format";
import type { Book } from "@/lib/types";
import { BookMenu } from "./book-menu";

const COLUMNS = ["Livro", "Status", "Formato", "Progresso", "Início", "Conclusão", "Avaliação"];

const Dash = () => <span className="text-text-tertiary">—</span>;

export function BookTable({ books }: { books: Book[] }) {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {books.map((book) => {
          const percent = progressPercent(book);
          return (
            <li key={book.id} className="flex flex-col gap-3 rounded border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <Link href={`/biblioteca/${book.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <BookCover title={book.title} size="sm" />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate text-sm font-medium">{book.title}</span>
                    <span className="truncate text-xs text-text-secondary">{book.author}</span>
                  </span>
                </Link>
                <BookMenu book={book} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <StatusBadge status={book.status} />
                {book.format && <span className="text-[13px] text-text-secondary">{FORMAT_LABEL[book.format]}</span>}
                <span className="ml-auto">
                  <Rating value={book.rating} />
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <ProgressBar value={percent} tone={toneOf(book.status)} className="flex-1" />
                <span className="text-xs text-text-secondary">{percent}%</span>
              </div>
              {(book.startedAt || book.finishedAt) && (
                <p className="text-xs text-text-tertiary">
                  {book.startedAt && `Início ${formatDate(book.startedAt)}`}
                  {book.startedAt && book.finishedAt && " · "}
                  {book.finishedAt && `Conclusão ${formatDate(book.finishedAt)}`}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="relative hidden overflow-x-auto rounded border border-border bg-surface md:block">
      <table className="w-full min-w-[960px] text-left">
        <thead className="bg-surface-muted">
          <tr className="border-b border-border text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className="px-4 py-2.5 first:pl-5">
                {column}
              </th>
            ))}
            <th scope="col" className="w-12 px-4 py-2.5">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => {
            const percent = progressPercent(book);
            return (
              <tr key={book.id} className="border-b border-border last:border-b-0 hover:bg-surface-muted/60">
                <td className="py-3 pr-4 pl-5">
                  <Link href={`/biblioteca/${book.id}`} className="flex items-center gap-3">
                    <BookCover title={book.title} size="sm" />
                    <span className="flex flex-col gap-px">
                      <span className="text-sm font-medium">{book.title}</span>
                      <span className="text-xs text-text-secondary">{book.author}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4">
                  <StatusBadge status={book.status} />
                </td>
                <td className="px-4 text-[13px] text-text-secondary">
                  {book.format ? FORMAT_LABEL[book.format] : <Dash />}
                </td>
                <td className="px-4">
                  <div className="flex items-center gap-2.5">
                    <ProgressBar value={percent} tone={toneOf(book.status)} className="w-[84px]" />
                    <span className="text-xs text-text-secondary">{percent}%</span>
                  </div>
                </td>
                <td className="px-4 text-[13px] text-text-secondary">
                  {book.startedAt ? formatDate(book.startedAt) : <Dash />}
                </td>
                <td className="px-4 text-[13px] text-text-secondary">
                  {book.finishedAt ? formatDate(book.finishedAt) : <Dash />}
                </td>
                <td className="px-4">
                  <Rating value={book.rating} />
                </td>
                <td className="px-4">
                  <BookMenu book={book} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
