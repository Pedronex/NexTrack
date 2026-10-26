import Link from "next/link";
import { cn } from "@/lib/cn";
import { type LibraryParams, libraryHref } from "./params";

interface PaginationProps {
  params: LibraryParams;
  total: number;
  pageSize: number;
}

const item = "flex size-8 items-center justify-center rounded-[5px] border text-[13px] font-medium";

export function Pagination({ params, total, pageSize }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const from = (params.page - 1) * pageSize + 1;
  const to = Math.min(total, params.page * pageSize);
  const go = (page: number) => libraryHref(params, { page });

  return (
    <nav aria-label="Paginação" className="flex items-center justify-between">
      <p className="text-[13px] text-text-secondary">
        {from}–{to} de {total} livros
      </p>
      <div className="flex gap-1.5">
        {params.page > 1 && (
          <Link href={go(params.page - 1)} aria-label="Página anterior" className={cn(item, "border-border bg-surface text-text-secondary")}>
            ‹
          </Link>
        )}
        {Array.from({ length: pages }, (_, i) => i + 1).map((page) => (
          <Link
            key={page}
            href={go(page)}
            aria-current={page === params.page ? "page" : undefined}
            className={cn(
              item,
              page === params.page ? "border-transparent bg-ink text-ink-fg" : "border-border bg-surface text-text-secondary",
            )}
          >
            {page}
          </Link>
        ))}
        {params.page < pages && (
          <Link href={go(params.page + 1)} aria-label="Próxima página" className={cn(item, "border-border bg-surface text-text-secondary")}>
            ›
          </Link>
        )}
      </div>
    </nav>
  );
}
