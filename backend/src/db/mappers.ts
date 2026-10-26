import type { Book, BookFormat, ReadingSession, Status } from "../types";
import type { BookRow, SessionRow } from "./rows";

export function toBook(row: BookRow): Book {
	return {
		id: row.id,
		title: row.title,
		author: row.author,
		status: row.status as Status | null,
		format: row.format as BookFormat | null,
		currentPage: row.current_page,
		totalPages: row.total_pages,
		startedAt: row.started_at,
		finishedAt: row.finished_at,
		rating: row.rating,
		isbn: row.isbn,
	};
}

export function toSession(row: SessionRow): ReadingSession {
	return {
		id: row.id,
		title: row.title,
		bookId: row.book_id,
		date: row.date,
		startPage: row.start_page,
		endPage: row.end_page,
		pagesRead: row.pages_read,
		durationMin: row.duration_min,
		spotifyUrl: row.spotify_url,
		notes: row.notes,
	};
}

/** Só inclui chaves presentes na entrada; null preservado (limpa o campo). */
export function toBookRow(input: Partial<Omit<Book, "id">>): Partial<BookRow> {
	const row: Partial<BookRow> = {};
	if ("title" in input) row.title = input.title as string;
	if ("author" in input) row.author = input.author ?? null;
	if ("status" in input) row.status = input.status ?? null;
	if ("format" in input) row.format = input.format ?? null;
	if ("currentPage" in input) row.current_page = input.currentPage ?? null;
	if ("totalPages" in input) row.total_pages = input.totalPages ?? null;
	if ("startedAt" in input) row.started_at = input.startedAt ?? null;
	if ("finishedAt" in input) row.finished_at = input.finishedAt ?? null;
	if ("rating" in input) row.rating = input.rating ?? null;
	if ("isbn" in input) row.isbn = input.isbn ?? null;
	return row;
}

export function toSessionRow(
	input: Partial<Omit<ReadingSession, "id">>,
): Partial<SessionRow> {
	const row: Partial<SessionRow> = {};
	if ("bookId" in input) row.book_id = input.bookId ?? null;
	if ("title" in input) row.title = input.title as string;
	if ("date" in input) row.date = input.date ?? null;
	if ("startPage" in input) row.start_page = input.startPage ?? null;
	if ("endPage" in input) row.end_page = input.endPage ?? null;
	if ("pagesRead" in input) row.pages_read = input.pagesRead ?? null;
	if ("durationMin" in input) row.duration_min = input.durationMin ?? null;
	if ("spotifyUrl" in input) row.spotify_url = input.spotifyUrl ?? null;
	if ("notes" in input) row.notes = input.notes ?? null;
	return row;
}
