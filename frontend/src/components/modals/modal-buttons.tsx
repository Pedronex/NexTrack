"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { useModals } from "./modal-context";

type ButtonProps = Omit<ComponentProps<typeof Button>, "onClick">;

/** Abre o registro de sessão, opcionalmente já com um livro escolhido. */
export function OpenSessionButton({ bookId, ...props }: ButtonProps & { bookId?: string }) {
  const modals = useModals();
  return <Button onClick={() => modals.openSession(bookId)} {...props} />;
}

/** Abre o formulário de livro: novo, ou edição quando recebe `bookId`. */
export function OpenBookButton({ bookId, ...props }: ButtonProps & { bookId?: string }) {
  const modals = useModals();
  return <Button onClick={() => modals.openBook(bookId)} {...props} />;
}
