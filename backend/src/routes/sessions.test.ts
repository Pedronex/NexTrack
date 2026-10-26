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
import { sessionsRoutes } from "./sessions";
import type { RouteDeps } from "./deps";

const ISSUER = "https://oxuzoobstcjbsavxapua.supabase.co/auth/v1";
const env = {
	SUPABASE_URL: "https://oxuzoobstcjbsavxapua.supabase.co",
	SUPABASE_PUBLISHABLE_KEY: "pk",
	SUPABASE_SERVICE_ROLE_KEY: "sk",
	SPOTIFY_CLIENT_ID: "c",
	SPOTIFY_CLIENT_SECRET: "s",
	SPOTIFY_REDIRECT_URI: "http://localhost/spotify/retorno",
	TOKEN_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
} as Env;

const BOOK_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";

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

interface Call {
	table: string | null;
	op: string;
	filters: Record<string, unknown>;
	rpcName?: string;
	rpcArgs?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class Builder implements PromiseLike<any> {
	call: Call;
	constructor(
		private handler: (c: Call) => unknown,
		table: string | null,
		op = "select",
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
		(this.call as unknown as Record<string, unknown>).payload = p;
		return this;
	}
	update(p: unknown) {
		this.call.op = "update";
		(this.call as unknown as Record<string, unknown>).payload = p;
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
		return this;
	}
	single() {
		return this;
	}
	then<TResult1 = unknown, TResult2 = never>(
		resolve?: ((v: unknown) => TResult1 | PromiseLike<TResult1>) | null,
		reject?: ((e: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		return Promise.resolve().then(() => this.handler(this.call)).then(resolve, reject);
	}
}

function fakeDb(handler: (c: Call) => unknown) {
	return (_token: string) =>
		({
			from: (t: string) => new Builder(handler, t),
			rpc: (name: string, args: unknown) =>
				Promise.resolve(handler({ table: null, op: "rpc", filters: {}, rpcName: name, rpcArgs: args })),
		}) as never;
}

async function build(handler: (c: Call) => unknown) {
	const { getKey, token } = await auth();
	const deps: RouteDeps = { env, db: fakeDb(handler), getKey };
	const app = new Elysia({ aot: false })
		.onError(({ error, set }) => {
			const { status, body } = toErrorResponse(error);
			set.status = status;
			return body;
		})
		.use(sessionsRoutes(deps));
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

const SESSION_ROW = {
	id: SESSION_ID,
	user_id: "user-a",
	book_id: BOOK_ID,
	title: "S1",
	date: "2026-01-05",
	start_page: 0,
	end_page: 100,
	pages_read: 100,
	duration_min: null,
	spotify_url: null,
	notes: null,
};
const BOOK_ROW = {
	id: BOOK_ID,
	user_id: "user-a",
	title: "T",
	author: null,
	status: "Lendo",
	format: null,
	current_page: 100,
	total_pages: 656,
	started_at: "2026-01-05",
	finished_at: null,
	rating: null,
	isbn: null,
};

describe("sessionsRoutes", () => {
	test("sem token ⇒ 401", async () => {
		const { app } = await build(() => ({ data: [], error: null, count: 0 }));
		const res = await app.fetch(req("/sessions"));
		expect(res.status).toBe(401);
	});

	test("POST com bookId de outro usuário ⇒ 404 (book_not_found)", async () => {
		const { app, token } = await build(() => ({
			data: null,
			error: { code: "P0001", message: "book_not_found" },
		}));
		const res = await app.fetch(
			req("/sessions", token, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "S", bookId: BOOK_ID, date: "2026-01-05", startPage: 0, endPage: 10 }),
			}),
		);
		expect(res.status).toBe(404);
		expect(((await res.json()) as Record<string, string>).code).toBe("not_found");
	});

	test("endPage <= startPage ⇒ 400 end_page_must_exceed_start_page", async () => {
		const { app, token } = await build(() => ({
			data: null,
			error: { code: "P0001", message: "end_page_must_exceed_start_page" },
		}));
		const res = await app.fetch(
			req("/sessions", token, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "S", bookId: BOOK_ID, date: "2026-01-05", startPage: 50, endPage: 50 }),
			}),
		);
		expect(res.status).toBe(400);
		expect(((await res.json()) as Record<string, string>).code).toBe(
			"end_page_must_exceed_start_page",
		);
	});

	test("sucesso contém book.currentPage e book.status da função", async () => {
		const { app, token } = await build(() => ({
			data: { session: SESSION_ROW, book: BOOK_ROW },
			error: null,
		}));
		const res = await app.fetch(
			req("/sessions", token, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "S1", bookId: BOOK_ID, date: "2026-01-05", startPage: 0, endPage: 100 }),
			}),
		);
		expect(res.status).toBe(201);
		const body = (await res.json()) as {
			book: { currentPage: number; status: string };
		};
		expect(body.book.currentPage).toBe(100);
		expect(body.book.status).toBe("Lendo");
	});

	test("GET /sessions/:id alheio ⇒ 404", async () => {
		const { app, token } = await build(() => ({ data: null, error: null }));
		const res = await app.fetch(req(`/sessions/${SESSION_ID}`, token));
		expect(res.status).toBe(404);
	});
});
