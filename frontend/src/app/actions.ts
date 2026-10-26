"use server";

import { updateTag } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  BOOKS_TAG,
  createBook,
  deleteBook,
  updateBook,
  updateProgress,
} from "@/lib/api/books";
import { checkNotion, disconnectSpotify } from "@/lib/api/integrations";
import { SESSIONS_TAG, createSession } from "@/lib/api/sessions";
import type { Book, BookInput, ReadingSession, SessionInput, Status } from "@/lib/types";
import { type Errors, hasErrors, validateBook, validateSession } from "@/lib/validation";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const failure = (error: unknown): ActionResult<never> => ({
  ok: false,
  message: error instanceof ApiError ? error.message : "Não foi possível falar com a API.",
});

const invalid = (errors: Errors<object>): ActionResult<never> => ({
  ok: false,
  message: "Revise os campos destacados.",
  fieldErrors: errors as Record<string, string>,
});

export async function saveBookAction(id: string | null, input: BookInput): Promise<ActionResult<Book>> {
  const errors = validateBook(input);
  if (hasErrors(errors)) return invalid(errors);
  try {
    const book = id ? await updateBook(id, input) : await createBook(input);
    updateTag(BOOKS_TAG);
    return { ok: true, data: book };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteBookAction(id: string): Promise<ActionResult> {
  try {
    await deleteBook(id);
    updateTag(BOOKS_TAG);
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function updateProgressAction(
  id: string,
  currentPage: number,
  status?: Status,
): Promise<ActionResult<Book>> {
  if (!Number.isInteger(currentPage) || currentPage < 0) {
    return invalid({ currentPage: "Informe um número inteiro" });
  }
  try {
    const book = await updateProgress(id, currentPage, status);
    updateTag(BOOKS_TAG);
    return { ok: true, data: book };
  } catch (error) {
    return failure(error);
  }
}

export async function createSessionAction(
  input: SessionInput,
  totalPages: number | null,
): Promise<ActionResult<ReadingSession & { book?: Book }>> {
  const errors = validateSession(input, { totalPages });
  if (hasErrors(errors)) return invalid(errors);
  try {
    const session = await createSession(input);
    updateTag(SESSIONS_TAG);
    updateTag(BOOKS_TAG);
    return { ok: true, data: session };
  } catch (error) {
    return failure(error);
  }
}

export async function testNotionAction(): Promise<ActionResult> {
  const status = await checkNotion();
  return status.ok ? { ok: true, data: null } : { ok: false, message: status.error ?? "Falha na conexão" };
}

export async function disconnectSpotifyAction(): Promise<ActionResult> {
  try {
    await disconnectSpotify();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
