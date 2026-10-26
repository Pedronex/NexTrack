/** Linhas snake_case do Postgres (migrações supabase/). */

export interface BookRow {
	id: string;
	user_id: string;
	title: string;
	author: string | null;
	status: string | null;
	format: string | null;
	current_page: number | null;
	total_pages: number | null;
	started_at: string | null;
	finished_at: string | null;
	rating: number | null;
	isbn: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface SessionRow {
	id: string;
	user_id: string;
	book_id: string | null;
	title: string;
	date: string | null;
	start_page: number | null;
	end_page: number | null;
	pages_read: number | null;
	duration_min: number | null;
	spotify_url: string | null;
	notes: string | null;
	created_at?: string;
}
