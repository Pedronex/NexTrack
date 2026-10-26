"use client";

import { Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="confirm-title"
      className="m-auto w-full max-w-[440px] overflow-hidden rounded-[14px] bg-surface p-0 text-text-primary shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-3.5 p-6">
        <span className="flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger">
          <Trash2 size={18} />
        </span>
        <h2 id="confirm-title" className="font-display text-[22px] font-medium">
          {title}
        </h2>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-border bg-surface-muted px-6 py-3.5">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={pending}>
          {pending ? "Excluindo…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
