import "server-only";
import { cache } from "react";
import type { Book, BookInput, Page, Status } from "@/lib/types";
import { requireUser } from "@/lib/session";
import { api } from "./client";

const PAGE_SIZE = 100;

async function fetchAllBooks(token: string): Promise<Book[]> {
  const books: Book[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) query.set("cursor", cursor);
    const page: Page<Book> = await api(`/books?${query}`, { token });
    books.push(...page.data);
    cursor = page.hasMore ? page.nextCursor : null;
  } while (cursor);
  return books;
}

// Cache por requisição (React cache): nenhum dado atravessa contas.
// A sessão (cookie) identifica o usuário; o token vai no Authorization.
export const getAllBooks = cache(async (): Promise<Book[]> => {
  const { accessToken } = await requireUser();
  return fetchAllBooks(accessToken);
});

export async function getBook(id: string): Promise<Book | undefined> {
  const books = await getAllBooks();
  return books.find((book) => book.id === id);
}

export async function createBook(input: BookInput): Promise<Book> {
  const { accessToken } = await requireUser();
  return api<Book>("/books", { method: "POST", body: JSON.stringify(input), token: accessToken });
}

export async function updateBook(id: string, input: BookInput): Promise<Book> {
  const { accessToken } = await requireUser();
  return api<Book>(`/books/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    token: accessToken,
  });
}

export async function deleteBook(id: string): Promise<{ ok: true }> {
  const { accessToken } = await requireUser();
  return api<{ ok: true }>(`/books/${id}`, { method: "DELETE", token: accessToken });
}

export async function updateProgress(
  id: string,
  currentPage: number,
  status?: Status,
): Promise<Book> {
  const { accessToken } = await requireUser();
  return api<Book>(`/books/${id}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ currentPage, status }),
    token: accessToken,
  });
}
