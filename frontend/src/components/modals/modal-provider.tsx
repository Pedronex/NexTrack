"use client";

import { type ReactNode, useCallback, useMemo, useState } from "react";
import type { Book } from "@/lib/types";
import { BookDrawer } from "./book-drawer";
import { type ModalApi, ModalContext } from "./modal-context";
import { SessionDrawer } from "./session-drawer";

type ModalState = { type: "book"; bookId?: string } | { type: "session"; bookId?: string } | null;

interface ModalProviderProps {
  booksPromise: Promise<Book[]>;
  children: ReactNode;
}

export function ModalProvider({ booksPromise, children }: ModalProviderProps) {
  const [state, setState] = useState<ModalState>(null);

  const api = useMemo<ModalApi>(
    () => ({
      openBook: (bookId) => setState({ type: "book", bookId }),
      openSession: (bookId) => setState({ type: "session", bookId }),
      close: () => setState(null),
    }),
    [],
  );
  const close = useCallback(() => setState(null), []);

  return (
    <ModalContext value={api}>
      {children}
      {state?.type === "book" && <BookDrawer bookId={state.bookId} booksPromise={booksPromise} onClose={close} />}
      {state?.type === "session" && (
        <SessionDrawer presetBookId={state.bookId} booksPromise={booksPromise} onClose={close} />
      )}
    </ModalContext>
  );
}
