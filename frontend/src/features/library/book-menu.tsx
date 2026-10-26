"use client";

import { Ellipsis, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useModals } from "@/components/modals/modal-context";
import type { Book } from "@/lib/types";
import { DeleteBookDialog } from "./delete-book-dialog";

const item =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13px] hover:bg-surface-muted";

export function BookMenu({ book }: { book: Book }) {
  const modals = useModals();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Ações para ${book.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-8 cursor-pointer items-center justify-center rounded-md text-text-tertiary hover:bg-surface-muted hover:text-text-primary"
      >
        <Ellipsis size={16} />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-10 mt-1 w-52 rounded-[5px] border border-border bg-surface p-1.5 shadow-lg">
          <Link role="menuitem" href={`/biblioteca/${book.id}`} className={item}>
            <ExternalLink size={15} className="text-text-secondary" />
            Abrir detalhes
          </Link>
          <button type="button" role="menuitem" className={item} onClick={run(() => modals.openSession(book.id))}>
            <Plus size={15} className="text-text-secondary" />
            Registrar sessão
          </button>
          <button type="button" role="menuitem" className={item} onClick={run(() => modals.openBook(book.id))}>
            <Pencil size={15} className="text-text-secondary" />
            Editar
          </button>
          <button type="button" role="menuitem" className={`${item} text-danger`} onClick={run(() => setDeleting(true))}>
            <Trash2 size={15} />
            Excluir
          </button>
        </div>
      )}
      <DeleteBookDialog book={deleting ? book : null} onClose={() => setDeleting(false)} />
    </div>
  );
}
