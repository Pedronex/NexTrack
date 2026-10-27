import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { Skeleton } from "@/components/ui/states";
import { getBook } from "@/lib/api/books";
import { getAllSessions } from "@/lib/api/sessions";
import { bookStats, sessionsOfBook } from "@/lib/domain/sessions";
import { getToday } from "@/lib/today";
import { BookHeader } from "@/features/book/book-header";
import { Evolution } from "@/features/book/evolution";
import { History } from "@/features/book/history";
import { QuickUpdate } from "@/features/book/quick-update";

export const metadata: Metadata = { title: "Detalhe do livro" };

export default function BookPage({ params }: PageProps<"/biblioteca/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <TopBar eyebrow="Biblioteca" title="Detalhe do livro" />
          <div className="flex flex-col gap-10 px-4 sm:px-6 lg:px-10 pt-2 pb-14" aria-busy>
            <Skeleton className="h-[290px]" />
            <Skeleton className="h-[260px]" />
          </div>
        </>
      }
    >
      <BookDetail params={params} />
    </Suspense>
  );
}

async function BookDetail({ params }: Pick<PageProps<"/biblioteca/[id]">, "params">) {
  const { id } = await params;
  const [book, sessions, today] = await Promise.all([getBook(id), getAllSessions(), getToday()]);
  if (!book) notFound();

  const stats = bookStats(book, sessionsOfBook(sessions, book.id), today);

  return (
    <>
      <TopBar eyebrow={`Biblioteca  ›  ${book.title}`} title="Detalhe do livro" />
      <div className="flex flex-col gap-10 px-4 sm:px-6 lg:px-10 pt-2 pb-14">
        <div className="flex flex-col gap-6 xl:flex-row">
          <BookHeader book={book} stats={stats} />
          <QuickUpdate key={`${book.currentPage}-${book.status}`} book={book} />
        </div>
        <div className="flex flex-col gap-6 xl:flex-row">
          <History book={book} stats={stats} />
          <Evolution book={book} stats={stats} />
        </div>
      </div>
    </>
  );
}
