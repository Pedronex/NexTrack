import { describe, expect, test } from "bun:test";
import { toBook, toBookRow, toSession, toSessionRow } from "./mappers";
import type { BookRow, SessionRow } from "./rows";

describe("mappers", () => {
	test("toBook converte snake_case → camelCase", () => {
		const row: BookRow = {
			id: "b1",
			user_id: "u1",
			title: "T",
			author: "A",
			status: "Lendo",
			format: "Físico",
			current_page: 10,
			total_pages: 100,
			started_at: "2026-01-05",
			finished_at: null,
			rating: 4,
			isbn: null,
		};
		const book = toBook(row);
		expect(book.currentPage).toBe(10);
		expect(book.totalPages).toBe(100);
		expect(book.startedAt).toBe("2026-01-05");
		expect(book.status).toBe("Lendo");
	});

	test("toBookRow só inclui chaves presentes e preserva null", () => {
		expect(toBookRow({ title: "T" })).toEqual({ title: "T" });
		expect(toBookRow({ author: null, rating: 5 })).toEqual({ author: null, rating: 5 });
		expect(toBookRow({})).toEqual({});
	});

	test("toSession mapeia book_id/duration_min/spotify_url", () => {
		const row: SessionRow = {
			id: "s1",
			user_id: "u1",
			book_id: "b1",
			title: "S",
			date: "2026-01-05",
			start_page: 0,
			end_page: 20,
			pages_read: 20,
			duration_min: 30,
			spotify_url: "https://open.spotify.com/x",
			notes: null,
		};
		const s = toSession(row);
		expect(s.bookId).toBe("b1");
		expect(s.durationMin).toBe(30);
		expect(s.spotifyUrl).toBe("https://open.spotify.com/x");
		expect(toSessionRow({ bookId: null, notes: "n" })).toEqual({
			book_id: null,
			notes: "n",
		});
	});
});
