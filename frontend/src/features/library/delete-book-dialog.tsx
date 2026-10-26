"use client";

import { Suspense, useTransition } from "react";
import { useRouter } from "next/navigation";
import { countBookSessionsAction, deleteBookAction } from "@/app/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { Book } from "@/lib/types";

interface DeleteBookDialogProps {
  book: Book | null;
  onClose: () => void;
  /** Para onde ir depois de excluir (ex.: ao excluir a partir do detalhe). */
  redirectTo?: string;
}

async function DeleteDescription({ bookId }: { bookId: string }) {
  const count = await countBookSessionsAction(bookId).catch(() => null);
  const sessionsText =
    count === null
      ? "as sessões vinculadas"
      : count === 1
        ? "a 1 sessão vinculada"
        : `as ${count} sessões vinculadas`;
  return (
    <>O livro e {sessionsText} serão apagados permanentemente. Esta ação não pode ser desfeita.</>
  );
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
      description={
        book ? (
          <Suspense fallback="O livro e as sessões vinculadas serão apagados permanentemente.">
            <DeleteDescription bookId={book.id} />
          </Suspense>
        ) : (
          "Excluir livro?"
        )
      }
      confirmLabel="Excluir"
      pending={pending}
      onConfirm={confirm}
      onCancel={onClose}
    />
  );
}
