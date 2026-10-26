"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useModals } from "@/components/modals/modal-context";
import { Button } from "@/components/ui/button";
import { DeleteBookDialog } from "@/features/library/delete-book-dialog";
import type { Book } from "@/lib/types";

export function BookActions({ book }: { book: Book }) {
  const modals = useModals();
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => modals.openSession(book.id)}>
        <Plus size={14} />
        Registrar sessão
      </Button>
      <Button size="sm" variant="secondary" onClick={() => modals.openBook(book.id)}>
        <Pencil size={14} />
        Editar
      </Button>
      <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setDeleting(true)}>
        <Trash2 size={14} />
        Excluir
      </Button>
      <DeleteBookDialog book={deleting ? book : null} onClose={() => setDeleting(false)} redirectTo="/biblioteca" />
    </div>
  );
}
