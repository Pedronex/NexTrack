"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { isDeleteConfirmed } from "@/lib/confirm-word";

export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const confirmed = isDeleteConfirmed(typed);

  if (!open) return null;

  const submit = () =>
    startTransition(async () => {
      if (!confirmed) {
        setError("Digite EXCLUIR para confirmar.");
        return;
      }
      const res = await deleteAccountAction();
      if (!res.ok) {
        setError(res.message);
        toast.show({ kind: "error", title: "Não foi possível excluir", description: res.message });
      }
    });

  return (
    <div role="dialog" aria-modal aria-label="Excluir conta" className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-[440px] rounded-[14px] bg-surface p-6 shadow-2xl">
        <h2 className="font-display text-[22px] font-medium">Excluir conta?</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Seus livros, sessões e conexões serão apagados permanentemente. Esta ação não pode ser desfeita.
        </p>
        <div className="mt-4">
          <Field label="Digite EXCLUIR para confirmar" htmlFor="delete-confirm" error={error ?? undefined}>
            <TextInput
              id="delete-confirm"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setError(null);
              }}
              placeholder="EXCLUIR"
              autoComplete="off"
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={submit} disabled={pending || !confirmed}>
            {pending ? "Excluindo…" : "Excluir minha conta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
