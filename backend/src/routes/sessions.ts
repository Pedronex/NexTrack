import Elysia from "elysia";
import z from "zod";
import { authPlugin } from "../auth/plugin";
import { ApiError } from "../lib/errors";
import { toBook, toSession, toSessionRow } from "../db/mappers";
import type { BookRow, SessionRow } from "../db/rows";
import { decodeCursor, encodeCursor } from "./books";
import type { RouteDeps } from "./deps";

const sessionFields = z.object({
	title: z.string().min(1),
	bookId: z.string().uuid().nullable(),
	date: z.string().nullable(),
	startPage: z.number().int().min(0).nullable(),
	endPage: z.number().int().min(0).nullable(),
	pagesRead: z.number().int().min(0).nullable(),
	durationMin: z.number().min(0).nullable(),
	spotifyUrl: z.string().nullable(),
	notes: z.string().nullable(),
});

const createBody = sessionFields.partial().required({ title: true });
const updateBody = sessionFields.partial();
const idParams = z.object({ id: z.string().uuid() });
const listQuery = z.object({
	bookId: z.string().uuid().optional(),
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function sessionsRoutes(deps: RouteDeps) {
	const auth = deps.getKey ? authPlugin(deps.env, deps.getKey) : authPlugin(deps.env);
	return new Elysia({ prefix: "/sessions" }).use(auth).get(
		"/",
		async ({ user, query }) => {
			const offset = query.cursor ? decodeCursor(query.cursor) : 0;
			const limit = query.limit;
			const db = deps.db(user.token);
			let q = db
				.from("reading_sessions")
				.select("*", { count: "exact" })
				.eq("user_id", user.id)
				.order("date", { ascending: false })
				.range(offset, offset + limit - 1);
			if (query.bookId) q = q.eq("book_id", query.bookId);
			const { data, error, count } = (await q) as unknown as {
				data: SessionRow[] | null;
				error: { code?: string; message?: string } | null;
				count: number | null;
			};
			if (error) {
				if (error.code === "PGRST116")
					throw new ApiError(404, "not_found", "Sessão não encontrada");
				throw new ApiError(500, "internal_error", "Erro interno");
			}
			const rows = data ?? [];
			const total = count ?? rows.length;
			const next = offset + rows.length;
			return {
				data: rows.map(toSession),
				nextCursor: next < total ? encodeCursor(next) : null,
				hasMore: next < total,
			};
		},
		{ query: listQuery },
	).get(
		"/:id",
		async ({ user, params }) => {
			const db = deps.db(user.token);
			const { data, error } = (await db
				.from("reading_sessions")
				.select("*")
				.eq("id", params.id)
				.eq("user_id", user.id)
				.maybeSingle()) as unknown as {
				data: SessionRow | null;
				error: { code?: string; message?: string } | null;
			};
			if (error) throw new ApiError(500, "internal_error", "Erro interno");
			if (!data) throw new ApiError(404, "not_found", "Sessão não encontrada");
			return toSession(data);
		},
		{ params: idParams },
	).post(
		"/",
		async ({ user, body, set }) => {
			const db = deps.db(user.token);
			if (!body.bookId) {
				// Sessão sem livro: insere direto (sem progresso).
				const { data, error } = (await db
					.from("reading_sessions")
					.insert({
						...toSessionRow(body),
						user_id: user.id,
						date: body.date ?? new Date().toISOString().slice(0, 10),
					})
					.select()
					.single()) as unknown as {
					data: SessionRow | null;
					error: { code?: string; message?: string } | null;
				};
				if (error) throw new ApiError(500, "internal_error", "Erro interno");
				set.status = 201;
				return toSession(data as SessionRow);
			}
			const { data, error } = (await db.rpc("register_session", {
				p_book_id: body.bookId,
				p_title: body.title,
				p_date: body.date ?? new Date().toISOString().slice(0, 10),
				p_start_page: body.startPage ?? null,
				p_end_page: body.endPage ?? null,
				p_duration_min: body.durationMin ?? null,
				p_spotify_url: body.spotifyUrl ?? null,
				p_notes: body.notes ?? null,
			})) as unknown as {
				data: { session: SessionRow; book: BookRow } | null;
				error: { code?: string; message?: string } | null;
			};
			if (error) {
				if (error.message === "book_not_found")
					throw new ApiError(404, "not_found", "Livro não encontrado");
				throw new ApiError(400, error.message || "validation_error", error.message || "Dados inválidos");
			}
			set.status = 201;
			const result = data as { session: SessionRow; book: BookRow };
			return { ...toSession(result.session), book: toBook(result.book) };
		},
		{ body: createBody },
	).patch(
		"/:id",
		async ({ user, params, body }) => {
			const db = deps.db(user.token);
			const { data, error } = (await db
				.from("reading_sessions")
				.update(toSessionRow(body))
				.eq("id", params.id)
				.eq("user_id", user.id)
				.select()
				.maybeSingle()) as unknown as {
				data: SessionRow | null;
				error: { code?: string; message?: string } | null;
			};
			if (error) throw new ApiError(500, "internal_error", "Erro interno");
			if (!data) throw new ApiError(404, "not_found", "Sessão não encontrada");
			return toSession(data);
		},
		{ params: idParams, body: updateBody },
	).delete(
		"/:id",
		async ({ user, params }) => {
			const db = deps.db(user.token);
			const { data, error } = (await db
				.from("reading_sessions")
				.delete()
				.eq("id", params.id)
				.eq("user_id", user.id)
				.select("id")) as unknown as {
				data: { id: string }[] | null;
				error: { code?: string; message?: string } | null;
			};
			if (error) throw new ApiError(500, "internal_error", "Erro interno");
			if (!data || data.length === 0)
				throw new ApiError(404, "not_found", "Sessão não encontrada");
			return { ok: true };
		},
		{ params: idParams },
	);
}
