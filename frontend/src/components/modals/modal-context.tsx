"use client";

import { createContext, use } from "react";

export interface ModalApi {
  /** Abre o formulário de livro: novo, ou edição quando recebe um id. */
  openBook: (bookId?: string) => void;
  /** Abre o registro de sessão, opcionalmente já com um livro escolhido. */
  openSession: (bookId?: string) => void;
  close: () => void;
}

export const ModalContext = createContext<ModalApi | null>(null);

export function useModals() {
  const context = use(ModalContext);
  if (!context) throw new Error("useModals precisa estar dentro de <ModalProvider>");
  return context;
}
