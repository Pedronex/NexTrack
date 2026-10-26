"use server";

import { ApiError } from "@/lib/api/client";
import {
  createBook,
  deleteBook,
  updateBook,
  updateProgress,
} from "@/lib/api/books";
import { checkNotion, disconnectSpotify, getSpotifyConnectUrl } from "@/lib/api/integrations";
import { createSession } from "@/lib/api/sessions";
import type { Book, BookInput, ReadingSession, SessionInput, Status } from "@/lib/types";
import { redirect } from "next/navigation";
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
    return { ok: true, data: book };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteBookAction(id: string): Promise<ActionResult> {
  try {
    await deleteBook(id);
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

export async function connectSpotifyAction(): Promise<never> {
  redirect(await getSpotifyConnectUrl());
}
