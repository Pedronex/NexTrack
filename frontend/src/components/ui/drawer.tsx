"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/** Gaveta lateral sobre <dialog> nativo: foco preso, Esc e scrim sem código extra. */
export function Drawer({ open, onClose, title, subtitle, children, footer }: DrawerProps) {
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
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      aria-labelledby="drawer-title"
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-[540px] bg-surface p-0 text-text-primary shadow-2xl backdrop:bg-black/40"
    >
      <form method="dialog" className="hidden" />
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-border px-7 pt-6 pb-5">
          <div className="flex flex-col gap-1">
            <h2 id="drawer-title" className="font-display text-[26px] font-medium">
              {title}
            </h2>
            <p className="text-[13px] text-text-secondary">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-surface-muted text-text-secondary hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </header>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-7 py-6">{children}</div>
        <footer className="flex items-center gap-2.5 border-t border-border px-7 py-4">{footer}</footer>
      </div>
    </dialog>
  );
}
