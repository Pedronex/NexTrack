"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteBookAction } from "@/app/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { Book } from "@/lib/types";

interface DeleteBookDialogProps {
  book: Book | null;
  onClose: () => void;
  /** Para onde ir depois de excluir (ex.: ao excluir a partir do detalhe). */
  redirectTo?: string;
}

export function DeleteBookDialog({ book, onClose, redirectTo }: DeleteBookDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!book) return;
    startTransition(async () => {
      const result = await deleteBookAction(book.id);
      if (!result.ok) {
        toast.show({ kind: "error", title: "Não foi possível excluir", description: result.message });
        return onClose();
      }
      toast.show({ kind: "success", title: "Livro excluído", description: book.title });
      onClose();
      if (redirectTo) router.push(redirectTo);
    });
  }

  return (
    <ConfirmDialog
      open={book !== null}
      title={book ? `Excluir “${book.title}”?` : "Excluir livro?"}
      description="O livro será arquivado no Notion e deixa de aparecer no NexTrack. Você pode restaurá-lo pela lixeira do Notion."
      confirmLabel="Excluir"
      pending={pending}
      onConfirm={confirm}
      onCancel={onClose}
    />
  );
}
