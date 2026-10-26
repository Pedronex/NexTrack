import { describe, expect, test } from "bun:test";
import Elysia from "elysia";
import {
	createLocalJWKSet,
	exportJWK,
	generateKeyPair,
	SignJWT,
} from "jose";
import type { Env } from "../config/worker-env";
import { toErrorResponse } from "../lib/errors";
import { booksRoutes } from "./books";
import type { RouteDeps } from "./deps";

const ISSUER = "https://oxuzoobstcjbsavxapua.supabase.co/auth/v1";
const env = {
	SUPABASE_URL: "https://oxuzoobstcjbsavxapua.supabase.co",
	SUPABASE_PUBLISHABLE_KEY: "pk",
	SUPABASE_SERVICE_ROLE_KEY: "sk",
	SPOTIFY_CLIENT_ID: "c",
	SPOTIFY_CLIENT_SECRET: "s",
	SPOTIFY_REDIRECT_URI: "http://x/spotify/retorno",
	TOKEN_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
} as Env;

async function auth() {
	const { publicKey, privateKey } = await generateKeyPair("ES256");
	const pubJwk = await exportJWK(publicKey);
	pubJwk.kid = "k";
	pubJwk.alg = "ES256";
	const getKey = createLocalJWKSet({ keys: [pubJwk] });
	const token = await new SignJWT({ role: "authenticated" })
		.setProtectedHeader({ alg: "ES256", kid: "k" })
		.setSubject("user-a")
		.setAudience("authenticated")
		.setIssuer(ISSUER)
		.setExpirationTime("2h")
		.sign(privateKey);
	return { getKey, token };
}

/** Fake mínimo do SupabaseClient cobrindo as cadeias usadas pelas rotas. */
type Row = Record<string, unknown>;
interface Call {
	table: string | null;
	op: "select" | "insert" | "update" | "delete" | "rpc";
	filters: Record<string, unknown>;
	payload?: unknown;
	single?: "maybe" | "one";
	rpcName?: string;
	rpcArgs?: unknown;
}

class Builder {
	call: Call;
	constructor(
		private handler: (c: Call) => { data: unknown; error: unknown; count?: number },
		table: string | null,
		op: Call["op"] = "select",
	) {
		this.call = { table, op, filters: {} };
	}
	from(t: string) {
		this.call.table = t;
		return this;
	}
	select() {
		return this;
	}
	insert(p: unknown) {
		this.call.op = "insert";
		this.call.payload = p;
		return this;
	}
	update(p: unknown) {
		this.call.op = "update";
		this.call.payload = p;
		return this;
	}
	delete() {
		this.call.op = "delete";
		return this;
	}
	eq(col: string, val: unknown) {
		this.call.filters[col] = val;
		return this;
	}
	order() {
		return this;
	}
	range() {
		return this;
	}
	maybeSingle() {
		this.call.single = "maybe";
		return this;
	}
	single() {
		this.call.single = "one";
		return this;
	}
	then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
		try {
			resolve(this.handler(this.call) as unknown);
		} catch (e) {
			reject(e);
		}
	}
}

function fakeDb(handler: (c: Call) => { data: unknown; error: unknown; count?: number }) {
	return (_token: string) =>
		({
			from: (t: string) => new Builder(handler, t),
			rpc: (name: string, args: unknown) =>
				Promise.resolve(handler({ table: null, op: "rpc", filters: {}, rpcName: name, rpcArgs: args })),
		}) as never;
}

const BOOK = {
	id: "11111111-1111-4111-8111-111111111111",
	user_id: "user-a",
	title: "T",
	author: null,
	status: "Lendo",
	format: null,
	current_page: 10,
	total_pages: 100,
	started_at: null,
	finished_at: null,
	rating: null,
	isbn: null,
} as Row;

async function build(handler: (c: Call) => { data: unknown; error: unknown; count?: number }) {
	const { getKey, token } = await auth();
	const deps: RouteDeps = { env, db: fakeDb(handler), getKey };
	const app = new Elysia({ aot: false })
		.onError(({ error, set }) => {
			const { status, body } = toErrorResponse(error);
			set.status = status;
			return body;
		})
		.use(booksRoutes(deps));
	return { app, token };
}

const req = (path: string, token?: string, init: RequestInit = {}) =>
	new Request(`http://localhost${path}`, {
		...init,
		headers: {
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(init.headers ?? {}),
		},
	});

describe("booksRoutes", () => {
	test("sem token ⇒ 401", async () => {
		const { app } = await build(() => ({ data: [], error: null, count: 0 }));
		const res = await app.fetch(req("/books"));
		expect(res.status).toBe(401);
		const body = (await res.json()) as Record<string, string>;
		expect(body.code).toBe("unauthorized");
	});

	test("GET /books/:id inexistente ou de outro usuário ⇒ 404 not_found", async () => {
		const { app, token } = await build(() => ({ data: null, error: null }));
		const res = await app.fetch(
			req("/books/11111111-1111-4111-8111-111111111111", token),
		);
		expect(res.status).toBe(404);
		expect(((await res.json()) as Record<string, string>).code).toBe("not_found");
	});

	test("POST /books sem título ⇒ 400 validation_error", async () => {
		const { app, token } = await build(() => ({ data: BOOK, error: null }));
		const res = await app.fetch(
			req("/books", token, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ author: "A" }),
			}),
		);
		expect(res.status).toBe(400);
		expect(((await res.json()) as Record<string, string>).code).toBe("validation_error");
	});

	test("PATCH com currentPage > totalPages (check) ⇒ 400", async () => {
		const { app, token } = await build(() => ({
			data: null,
			error: { code: "23514", message: "check" },
		}));
		const res = await app.fetch(
			req("/books/11111111-1111-4111-8111-111111111111", token, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ currentPage: 200 }),
			}),
		);
		expect(res.status).toBe(400);
	});

	test("DELETE de livro alheio (0 linhas) ⇒ 404", async () => {
		const { app, token } = await build(() => ({ data: [], error: null }));
		const res = await app.fetch(
			req("/books/11111111-1111-4111-8111-111111111111", token, { method: "DELETE" }),
		);
		expect(res.status).toBe(404);
	});

	test("limit=500 ⇒ 400", async () => {
		const { app, token } = await build(() => ({ data: [], error: null, count: 0 }));
		const res = await app.fetch(req("/books?limit=500", token));
		expect(res.status).toBe(400);
	});
});
