"use client";

import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { BookCover } from "@/components/ui/book-cover";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";
import type { Book } from "@/lib/types";

interface BookPickerProps {
  books: Book[];
  selected: Book | undefined;
  onSelect: (book: Book) => void;
}

const subtitle = (book: Book) =>
  [book.author, book.totalPages ? `pág. atual ${book.currentPage ?? 0} de ${book.totalPages}` : null]
    .filter(Boolean)
    .join(" · ");

export function BookPicker({ books, selected, onSelect }: BookPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matches = books.filter((b) =>
    `${b.title} ${b.author ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[5px] border border-border-strong bg-surface px-3 py-2.5 text-left"
      >
        {selected ? (
          <>
            <BookCover title={selected.title} className="h-10 w-7" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{selected.title}</span>
              <span className="truncate text-xs text-text-secondary">{subtitle(selected)}</span>
            </span>
            <StatusBadge status={selected.status} />
          </>
        ) : (
          <span className="flex-1 text-sm text-text-tertiary">Escolha um livro</span>
        )}
        <ChevronDown size={16} className="shrink-0 text-text-tertiary" />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 flex max-h-[350px] flex-col rounded-[5px] border border-border bg-surface shadow-lg">
          <label className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Search size={15} className="text-text-tertiary" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar livro ou autor…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
            />
          </label>
          <ul role="listbox" className="overflow-y-auto py-1">
            {matches.map((book) => (
              <li key={book.id} role="option" aria-selected={book.id === selected?.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(book);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-surface-muted",
                    book.id === selected?.id && "bg-surface-muted",
                  )}
                >
                  <BookCover title={book.title} className="h-10 w-7" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{book.title}</span>
                    <span className="truncate text-xs text-text-secondary">{subtitle(book)}</span>
                  </span>
                  <StatusBadge status={book.status} />
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-3 py-4 text-center text-xs text-text-tertiary">Nenhum livro encontrado</li>}
          </ul>
          <p className="border-t border-border px-3 py-2 text-xs text-text-tertiary">
            Concluídos e abandonados não aparecem aqui.
          </p>
        </div>
      )}
    </div>
  );
}
