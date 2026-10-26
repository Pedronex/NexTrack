export type Status =
	| "Quero ler"
	| "Lendo"
	| "Pausado"
	| "Concluído"
	| "Abandonado";
export type BookFormat = "Físico" | "Digital" | "Audiobook" | "E-Book";

export interface Book {
	id: string;
	title: string;
	author: string | null;
	status: Status | null;
	format: BookFormat | null;
	currentPage: number | null;
	totalPages: number | null;
	startedAt: string | null;
	finishedAt: string | null;
	rating: number | null;
	isbn: string | null;
}

export interface ReadingSession {
	id: string;
	title: string;
	bookId: string | null;
	date: string | null;
	startPage: number | null;
	endPage: number | null;
	pagesRead: number | null;
	durationMin: number | null;
	spotifyUrl: string | null;
	notes: string | null;
}
