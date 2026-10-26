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
import { meRoutes, type MeDeps } from "./me";

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

const PROFILE = {
	user_id: "user-a",
	display_name: "Alice",
	yearly_goal: 24,
	show_mini_player: true,
};

function builders(lastSignInAt: string, deleted: { count: number }) {
	const userDb = () => ({
		from: () => ({
			select: () => ({
				eq: () => ({ maybeSingle: () => Promise.resolve({ data: PROFILE, error: null }) }),
			}),
			update: () => ({
				eq: () => ({
					select: () => ({ maybeSingle: () => Promise.resolve({ data: PROFILE, error: null }) }),
				}),
			}),
		}),
	});
	const service = () =>
		({
			auth: {
				admin: {
					getUserById: () =>
						Promise.resolve({
							data: {
								user: {
									email: "a@example.com",
									identities: [{ provider: "email" }, { provider: "google" }],
									last_sign_in_at: lastSignInAt,
								},
							},
							error: null,
						}),
					deleteUser: () => {
						deleted.count += 1;
						return Promise.resolve({ error: null });
					},
				},
			},
		}) as never;
	return { userDb, service };
}

async function build(opts: { lastSignInAt: string; now: number; deleted: { count: number } }) {
	const { getKey, token } = await auth();
	const { userDb, service } = builders(opts.lastSignInAt, opts.deleted);
	const deps: MeDeps = { env, db: userDb as never, service: service as never, now: () => opts.now, getKey };
	const app = new Elysia({ aot: false })
		.onError(({ error, set }) => {
			const { status, body } = toErrorResponse(error);
			set.status = status;
			return body;
		})
		.use(meRoutes(deps));
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

describe("meRoutes", () => {
	test("PATCH com yearlyGoal 0 ⇒ 400", async () => {
		const deleted = { count: 0 };
		const { app, token } = await build({
			lastSignInAt: new Date(Date.now() - 5 * 60_000).toISOString(),
			now: Date.now(),
			deleted,
		});
		const res = await app.fetch(
			req("/me", token, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ yearlyGoal: 0 }),
			}),
		);
		expect(res.status).toBe(400);
	});

	test("DELETE com login há 20min ⇒ 403 e nenhuma exclusão", async () => {
		const deleted = { count: 0 };
		const now = Date.now();
		const { app, token } = await build({
			lastSignInAt: new Date(now - 20 * 60_000).toISOString(),
			now,
			deleted,
		});
		const res = await app.fetch(req("/me", token, { method: "DELETE" }));
		expect(res.status).toBe(403);
		expect(((await res.json()) as Record<string, string>).code).toBe("recent_login_required");
		expect(deleted.count).toBe(0);
	});

	test("DELETE com login há 5min ⇒ 204 e deleteUser chamado 1 vez", async () => {
		const deleted = { count: 0 };
		const now = Date.now();
		const { app, token } = await build({
			lastSignInAt: new Date(now - 5 * 60_000).toISOString(),
			now,
			deleted,
		});
		const res = await app.fetch(req("/me", token, { method: "DELETE" }));
		expect(res.status).toBe(204);
		expect(deleted.count).toBe(1);
	});

	test("GET /me devolve perfil e provedores", async () => {
		const deleted = { count: 0 };
		const now = Date.now();
		const { app, token } = await build({
			lastSignInAt: new Date(now - 5 * 60_000).toISOString(),
			now,
			deleted,
		});
		const res = await app.fetch(req("/me", token));
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			displayName: string;
			yearlyGoal: number;
			providers: string[];
		};
		expect(body.displayName).toBe("Alice");
		expect(body.yearlyGoal).toBe(24);
		expect(body.providers).toContain("google");
	});
});
