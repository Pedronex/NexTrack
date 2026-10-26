// Espelha os contratos da API (backend/src/types/index.d.ts).

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

export type BookInput = Partial<Omit<Book, "id">>;
export type SessionInput = Partial<Omit<ReadingSession, "id">>;

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Subconjunto da resposta de /me/player/currently-playing que a UI usa. */
export interface SpotifyPlayback {
  active?: false;
  is_playing?: boolean;
  progress_ms?: number;
  item?: {
    name: string;
    duration_ms: number;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
    external_urls: { spotify: string };
  } | null;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}
