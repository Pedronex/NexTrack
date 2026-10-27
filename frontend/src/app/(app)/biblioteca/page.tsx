import { BookPlus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { OpenBookButton } from "@/components/modals/modal-buttons";
import { StateMessage } from "@/components/ui/states";
import { getAllBooks } from "@/lib/api/books";
import { getAllSessions } from "@/lib/api/sessions";
import { countByStatus, lastReadByBook, queryBooks } from "@/lib/domain/books";
import { plural } from "@/lib/format";
import { BookGrid } from "@/features/library/book-grid";
import { BookTable } from "@/features/library/book-table";
import { LibraryFilters } from "@/features/library/filters";
import { PAGE_SIZE, parseLibraryParams } from "@/features/library/params";
import { Pagination } from "@/features/library/pagination";
import { LibrarySkeleton } from "@/features/library/skeleton";
import { StatusTabs } from "@/features/library/status-tabs";

export const metadata: Metadata = { title: "Biblioteca" };

export default function LibraryPage({ searchParams }: PageProps<"/biblioteca">) {
  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <Library searchParams={searchParams} />
    </Suspense>
  );
}

async function Library({ searchParams }: Pick<PageProps<"/biblioteca">, "searchParams">) {
  const params = parseLibraryParams(await searchParams);
  const [books, sessions] = await Promise.all([getAllBooks(), getAllSessions()]);

  const matches = queryBooks(books, params, lastReadByBook(sessions));
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(params.page, pageCount);
  const visible = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const current = { ...params, page };

  const topBar = <TopBar eyebrow={`${books.length} ${plural(books.length, "livro", "livros")}`} title="Biblioteca" />;

  if (books.length === 0) {
    return (
      <>
        {topBar}
        <StateMessage
          icon={BookPlus}
          title="Nenhum livro na biblioteca"
          description="Comece cadastrando o que você está lendo agora ou quer ler em breve."
          actions={<OpenBookButton>Novo livro</OpenBookButton>}
        />
      </>
    );
  }

  return (
    <>
      {topBar}
      <div className="flex flex-col gap-8 px-4 sm:px-6 lg:px-10 pt-2 pb-14">
        <div className="flex flex-col gap-4">
          <StatusTabs params={current} total={books.length} counts={countByStatus(books)} />
          <LibraryFilters params={current} shown={visible.length} total={matches.length} />
        </div>
        {visible.length === 0 ? (
          <StateMessage
            icon={SearchX}
            title="Nenhum livro encontrado"
            description="Nenhum livro bate com esses filtros. Ajuste a busca ou limpe os filtros."
            actions={
              <Link href="/biblioteca" className="text-[13px] font-medium underline underline-offset-2">
                Limpar filtros
              </Link>
            }
          />
        ) : (
          <>
            {params.view === "grade" ? <BookGrid books={visible} /> : <BookTable books={visible} />}
            <Pagination params={current} total={matches.length} pageSize={PAGE_SIZE} />
          </>
        )}
      </div>
    </>
  );
}
