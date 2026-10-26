"use client";

import { CircleAlert, CircleCheck, PartyPopper } from "lucide-react";
import { type ReactNode, createContext, use, useCallback, useMemo, useState } from "react";

type ToastKind = "success" | "celebrate" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastApi {
  show: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = {
  success: <CircleCheck size={17} className="text-[#4cc07c]" />,
  celebrate: <PartyPopper size={17} className="text-[#ebc567]" />,
  error: <CircleAlert size={17} className="text-[#f07a6e]" />,
} satisfies Record<ToastKind, ReactNode>;

const DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { ...toast, id }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), DISMISS_MS);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-6 bottom-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-[400px] max-w-[calc(100vw-3rem)] items-start gap-3 rounded-xl bg-ink px-4 py-3.5 text-ink-fg shadow-xl"
          >
            <span className="mt-px">{ICONS[toast.kind]}</span>
            <div className="flex flex-col gap-0.5">
              <p className="text-[13px] font-semibold">{toast.title}</p>
              {toast.description && <p className="text-xs opacity-80">{toast.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const context = use(ToastContext);
  if (!context) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return context;
}
