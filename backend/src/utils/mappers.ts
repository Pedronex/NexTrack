import type { PageObjectResponse } from "@notionhq/client";
import { read } from "../plugins/props";
import type { Book, BookFormat, ReadingSession, Status } from "../types";

export const toBook = (pg: PageObjectResponse): Book => ({
	id: pg.id,
	title: read.title(pg, "Livro"),
	author: read.text(pg, "Autor"),
	status: read.select<Status>(pg, "Status"),
	format: read.select<BookFormat>(pg, "Formato"),
	currentPage: read.number(pg, "Página atual"),
	totalPages: read.number(pg, "Total de páginas"),
	startedAt: read.date(pg, "Data de início"),
	finishedAt: read.date(pg, "Data de conclusão"),
	rating: read.number(pg, "Avaliação"),
	isbn: read.text(pg, "ISBN"),
});

export const toSession = (pg: PageObjectResponse): ReadingSession => ({
	id: pg.id,
	title: read.title(pg, "Sessão"),
	bookId: read.relationIds(pg, "Livro")[0] ?? null,
	date: read.date(pg, "Data"),
	startPage: read.number(pg, "Página inicial"),
	endPage: read.number(pg, "Página final"),
	pagesRead: read.number(pg, "Páginas lidas"),
	durationMin: read.number(pg, "Duração (min)"),
	spotifyUrl: read.url(pg, "Spotify"),
	notes: read.text(pg, "Notas"),
});
