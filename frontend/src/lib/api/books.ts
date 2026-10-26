import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Book, BookInput, Page, Status } from "@/lib/types";
import { api } from "./client";

export const BOOKS_TAG = "books";
const PAGE_SIZE = 100;

async function fetchAllBooks(): Promise<Book[]> {
  const books: Book[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) query.set("cursor", cursor);
    const page: Page<Book> = await api(`/books?${query}`);
    books.push(...page.data);
    cursor = page.hasMore ? page.nextCursor : null;
  } while (cursor);
  return books;
}

export async function getAllBooks(): Promise<Book[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(BOOKS_TAG);
  return fetchAllBooks();
}

export async function getBook(id: string): Promise<Book | undefined> {
  const books = await getAllBooks();
  return books.find((book) => book.id === id);
}

export const createBook = (input: BookInput) =>
  api<Book>("/books", { method: "POST", body: JSON.stringify(input) });

export const updateBook = (id: string, input: BookInput) =>
  api<Book>(`/books/${id}`, { method: "PATCH", body: JSON.stringify(input) });

export const deleteBook = (id: string) =>
  api<{ ok: true }>(`/books/${id}`, { method: "DELETE" });

export const updateProgress = (id: string, currentPage: number, status?: Status) =>
  api<Book>(`/books/${id}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ currentPage, status }),
  });
