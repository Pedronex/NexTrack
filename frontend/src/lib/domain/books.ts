import type { Book, BookFormat, ReadingSession, Status } from "@/lib/types";

export const STATUSES: Status[] = ["Quero ler", "Lendo", "Pausado", "Concluído", "Abandonado"];
export const FORMATS: BookFormat[] = ["Físico", "Digital", "E-Book", "Audiobook"];

export const FORMAT_LABEL: Record<BookFormat, string> = {
  Físico: "Físico",
  Digital: "Digital",
  "E-Book": "E-book",
  Audiobook: "Audiolivro",
};

export type Tone = "want" | "reading" | "paused" | "done" | "drop";

export const STATUS_TONE: Record<Status, Tone> = {
  "Quero ler": "want",
  Lendo: "reading",
  Pausado: "paused",
  Concluído: "done",
  Abandonado: "drop",
};

// Classes completas para o Tailwind enxergar cada uma no build.
export const TONE_CLASSES: Record<Tone, { bg: string; fg: string; dot: string; border: string }> = {
  want: { bg: "bg-want-bg", fg: "text-want-fg", dot: "bg-want-dot", border: "border-want-dot" },
  reading: {
    bg: "bg-reading-bg",
    fg: "text-reading-fg",
    dot: "bg-reading-dot",
    border: "border-reading-dot",
  },
  paused: {
    bg: "bg-paused-bg",
    fg: "text-paused-fg",
    dot: "bg-paused-dot",
    border: "border-paused-dot",
  },
  done: { bg: "bg-done-bg", fg: "text-done-fg", dot: "bg-done-dot", border: "border-done-dot" },
  drop: { bg: "bg-drop-bg", fg: "text-drop-fg", dot: "bg-drop-dot", border: "border-drop-dot" },
};

export const toneOf = (status: Status | null): Tone => (status ? STATUS_TONE[status] : "want");

export function progressPercent(book: Pick<Book, "currentPage" | "totalPages" | "status">) {
  if (book.status === "Concluído") return 100;
  if (!book.totalPages) return 0;
  return Math.min(100, Math.round(((book.currentPage ?? 0) / book.totalPages) * 100));
}

export const pagesLeft = (book: Pick<Book, "currentPage" | "totalPages">) =>
  Math.max(0, (book.totalPages ?? 0) - (book.currentPage ?? 0));

export function countByStatus(books: Book[]) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const book of books) if (book.status) counts[book.status]++;
  return counts;
}

export function countByFormat(books: Book[]) {
  const counts = new Map<BookFormat, number>();
  for (const book of books) if (book.format) counts.set(book.format, (counts.get(book.format) ?? 0) + 1);
  return counts;
}

export const BOOK_ORDERS = {
  recente: "Última leitura",
  titulo: "Título",
  autor: "Autor",
  progresso: "Progresso",
  avaliacao: "Avaliação",
} as const;
export type BookOrder = keyof typeof BOOK_ORDERS;

export interface BookQuery {
  status?: Status;
  format?: BookFormat;
  text?: string;
  order: BookOrder;
}

// Livros sem autor vão para o fim da ordenação por autor.
const LAST = "￿";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Dia da última sessão de cada livro. */
export function lastReadByBook(sessions: ReadingSession[]) {
  const last = new Map<string, string>();
  for (const s of sessions) {
    if (!s.bookId || !s.date) continue;
    if (!last.has(s.bookId) || s.date > last.get(s.bookId)!) last.set(s.bookId, s.date);
  }
  return last;
}

export function queryBooks(books: Book[], query: BookQuery, lastRead: Map<string, string>) {
  const text = query.text ? normalize(query.text) : "";
  const filtered = books.filter(
    (book) =>
      (!query.status || book.status === query.status) &&
      (!query.format || book.format === query.format) &&
      (!text || normalize(`${book.title} ${book.author ?? ""}`).includes(text)),
  );

  const byTitle = (a: Book, b: Book) => a.title.localeCompare(b.title, "pt-BR");
  const compare: Record<BookOrder, (a: Book, b: Book) => number> = {
    recente: (a, b) =>
      (lastRead.get(b.id) ?? "").localeCompare(lastRead.get(a.id) ?? "") || byTitle(a, b),
    titulo: byTitle,
    autor: (a, b) =>
      (a.author ?? LAST).localeCompare(b.author ?? LAST, "pt-BR") || byTitle(a, b),
    progresso: (a, b) => progressPercent(b) - progressPercent(a) || byTitle(a, b),
    avaliacao: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || byTitle(a, b),
  };
  return filtered.toSorted(compare[query.order]);
}
