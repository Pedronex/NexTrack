import { describe, expect, test } from "bun:test";
import { planImport } from "./import-notion";
import type { Book, ReadingSession } from "../src/types";

const USER = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";

const books: Book[] = [
  {
    id: "notion-book-1",
    title: "Livro 1",
    author: "A",
    status: "Lendo",
    format: "Físico",
    currentPage: 10,
    totalPages: 100,
    startedAt: "2026-01-01",
    finishedAt: null,
    rating: null,
    isbn: null,
  },
  {
    id: "notion-book-2",
    title: "Livro 2",
    author: null,
    status: "Quero ler",
    format: null,
    currentPage: 0,
    totalPages: null,
    startedAt: null,
    finishedAt: null,
    rating: null,
    isbn: null,
  },
];

const sessions: ReadingSession[] = [
  {
    id: "notion-session-1",
    title: "S1",
    bookId: "notion-book-2",
    date: "2026-01-05",
    startPage: 0,
    endPage: 20,
    pagesRead: 20,
    durationMin: 30,
    spotifyUrl: null,
    notes: null,
  },
  {
    id: "notion-session-orphan",
    title: "Órfã",
    bookId: "notion-missing",
    date: "2026-01-06",
    startPage: 0,
    endPage: 5,
    pagesRead: 5,
    durationMin: null,
    spotifyUrl: null,
    notes: null,
  },
];

describe("planImport", () => {
  test("traduz bookId do Notion para o UUID novo", () => {
    const plan = planImport(books, sessions, USER);
    expect(plan.books).toHaveLength(2);
    const book2 = plan.books.find((b) => b.title === "Livro 2")!;
    expect(plan.sessions).toHaveLength(1);
    expect(plan.sessions[0].book_id).toBe(book2.id);
    expect(plan.sessions[0].title).toBe("S1");
  });

  test("sessão com livro ausente vai para skipped", () => {
    const plan = planImport(books, sessions, USER);
    expect(plan.skipped).toEqual([{ id: "notion-session-orphan", reason: "book_not_found" }]);
  });

  test("todas as linhas levam o user_id", () => {
    const plan = planImport(books, sessions, USER);
    for (const row of [...plan.books, ...plan.sessions]) {
      expect(row.user_id).toBe(USER);
    }
  });

  test("duas execuções geram UUIDs diferentes com as mesmas quantidades", () => {
    const a = planImport(books, sessions, USER);
    const b = planImport(books, sessions, USER);
    expect(a.books).toHaveLength(b.books.length);
    expect(a.sessions).toHaveLength(b.sessions.length);
    expect(new Set([...a.books, ...b.books].map((r) => r.id)).size).toBe(
      a.books.length + b.books.length,
    );
  });
});
