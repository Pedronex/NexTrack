import Elysia from "elysia";
import z from "zod";
import { authPlugin } from "../auth/plugin";
import { ApiError } from "../lib/errors";
import { toBook, toBookRow } from "../db/mappers";
import type { BookRow } from "../db/rows";
import type { RouteDeps } from "./deps";

const STATUS = ["Quero ler", "Lendo", "Pausado", "Concluído", "Abandonado"] as const;
const FORMAT = ["Físico", "Digital", "E-Book", "Audiobook"] as const;

const bookFields = z.object({
	title: z.string().min(1),
	author: z.string().nullable(),
	status: z.enum(STATUS).nullable(),
	format: z.enum(FORMAT).nullable(),
	currentPage: z.number().int().min(0).nullable(),
	totalPages: z.number().int().min(1).nullable(),
	startedAt: z.string().nullable(),
	finishedAt: z.string().nullable(),
	rating: z.number().min(0).max(5).nullable(),
	isbn: z.string().nullable(),
});

const createBody = bookFields.partial().required({ title: true });
const updateBody = bookFields.partial();
const idParams = z.object({ id: z.string().uuid() });
const listQuery = z.object({
	status: z.enum(STATUS).optional(),
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function encodeCursor(offset: number): string {
	return Buffer.from(String(offset), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): number {
	const raw = Buffer.from(cursor, "base64url").toString("utf8");
	const n = Number(raw);
	if (!Number.isInteger(n) || n < 0) throw new ApiError(400, "validation_error", "Cursor inválido");
	return n;
}

function mapPostgresError(error: { code?: string; message?: string }): ApiError {
	const code = error.code ?? "";
	const msg = error.message ?? "";
	if (code === "PGRST116") return new ApiError(404, "not_found", "Livro não encontrado");
	if (code === "23503") return new ApiError(400, "validation_error", "Referência inválida");
	if (code === "23514") return new ApiError(400, "validation_error", msg || "Dados inválidos");
	if (code === "P0001") {
		// Erro levantado pelas funções SQL (register_session/update_progress)
		return new ApiError(400, msg || "validation_error", msg || "Dados inválidos");
	}
	return new ApiError(500, "internal_error", "Erro interno");
}

export function booksRoutes(deps: RouteDeps) {
	const auth = deps.getKey
		? authPlugin(deps.env, deps.getKey)
		: authPlugin(deps.env);
	return new Elysia({ prefix: "/books" }).use(auth).get(
		"/",
		async ({ user, query }) => {
			const offset = query.cursor ? decodeCursor(query.cursor) : 0;
			const limit = query.limit;
			const db = deps.db(user.token);
			let q = db
				.from("books")
				.select("*", { count: "exact" })
				.eq("user_id", user.id)
				.order("title", { ascending: true })
				.range(offset, offset + limit - 1);
			if (query.status) q = q.eq("status", query.status);
			const { data, error, count } = (await q) as unknown as {
				data: BookRow[] | null;
				error: { code?: string; message?: string } | null;
				count: number | null;
			};
			if (error) throw mapPostgresError(error);
			const rows = data ?? [];
			const total = count ?? rows.length;
			const next = offset + rows.length;
			return {
				data: rows.map(toBook),
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
				.from("books")
				.select("*")
				.eq("id", params.id)
				.eq("user_id", user.id)
				.maybeSingle()) as unknown as {
				data: BookRow | null;
				error: { code?: string; message?: string } | null;
			};
			if (error) throw mapPostgresError(error);
			if (!data) throw new ApiError(404, "not_found", "Livro não encontrado");
			return toBook(data);
		},
		{ params: idParams },
	).post(
		"/",
		async ({ user, body, set }) => {
			const db = deps.db(user.token);
			const { data, error } = (await db
				.from("books")
				.insert({ ...toBookRow(body), user_id: user.id })
				.select()
				.single()) as unknown as {
				data: BookRow | null;
				error: { code?: string; message?: string } | null;
			};
			if (error) throw mapPostgresError(error);
			set.status = 201;
			return toBook(data as BookRow);
		},
		{
			body: createBody,
		},
	).patch(
		"/:id",
		async ({ user, params, body }) => {
			const db = deps.db(user.token);
			const { data, error } = (await db
				.from("books")
				.update(toBookRow(body))
				.eq("id", params.id)
				.eq("user_id", user.id)
				.select()
				.maybeSingle()) as unknown as {
				data: BookRow | null;
				error: { code?: string; message?: string } | null;
			};
			if (error) throw mapPostgresError(error);
			if (!data) throw new ApiError(404, "not_found", "Livro não encontrado");
			return toBook(data);
		},
		{ params: idParams, body: updateBody },
	).patch(
		"/:id/progress",
		async ({ user, params, body }) => {
			const db = deps.db(user.token);
			const { data, error } = (await db.rpc("update_progress", {
				p_book_id: params.id,
				p_page: body.currentPage,
				p_status: body.status ?? null,
			})) as unknown as {
				data: BookRow | null;
				error: { code?: string; message?: string } | null;
			};
			if (error) {
				if (error.message === "book_not_found")
					throw new ApiError(404, "not_found", "Livro não encontrado");
				throw mapPostgresError(error);
			}
			return toBook(data as BookRow);
		},
		{
			params: idParams,
			body: z.object({
				currentPage: z.number().int().min(0),
				status: z.enum(STATUS).optional(),
			}),
		},
	).delete(
		"/:id",
		async ({ user, params }) => {
			const db = deps.db(user.token);
			const { data, error } = (await db
				.from("books")
				.delete()
				.eq("id", params.id)
				.eq("user_id", user.id)
				.select("id")) as unknown as {
				data: { id: string }[] | null;
				error: { code?: string; message?: string } | null;
			};
			if (error) throw mapPostgresError(error);
			if (!data || data.length === 0)
				throw new ApiError(404, "not_found", "Livro não encontrado");
			return { ok: true };
		},
		{ params: idParams },
	);
}
