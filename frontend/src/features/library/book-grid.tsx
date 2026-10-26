import Link from "next/link";
import { BookCover } from "@/components/ui/book-cover";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { FORMAT_LABEL, progressPercent, toneOf } from "@/lib/domain/books";
import type { Book } from "@/lib/types";

const byline = (book: Book) =>
  [book.author, book.format && FORMAT_LABEL[book.format]].filter(Boolean).join(" · ");

export function BookGrid({ books }: { books: Book[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-9 md:grid-cols-3 xl:grid-cols-5">
      {books.map((book) => {
        const percent = progressPercent(book);
        return (
          <li key={book.id}>
            <Link href={`/biblioteca/${book.id}`} className="group flex flex-col gap-3.5">
              <BookCover title={book.title} size="fill" className="transition-transform group-hover:-translate-y-0.5" />
              <div className="flex flex-col gap-0.5">
                <h3 className="font-display text-[17px] leading-snug font-medium">{book.title}</h3>
                <p className="text-[13px] text-text-secondary">{byline(book)}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <StatusBadge status={book.status} />
                  {book.totalPages != null && <span className="text-xs font-semibold">{percent}%</span>}
                </div>
                {book.totalPages != null && <ProgressBar value={percent} tone={toneOf(book.status)} />}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
