import { describe, expect, test } from "bun:test";
import { buildAuthorizeUrl, consumeState, STATE_TTL_MS } from "./oauth";
import { SPOTIFY_SCOPES } from "./oauth";

const NOW = 1_700_000_000_000;
const REDIRECT = "https://app.example/spotify/retorno";

function memDb(rows: Record<string, { user_id: string; code_verifier: string; created_at: string }>) {
	const deleted: string[] = [];
	return {
		deleted,
		db: {
			from: (table: string) => ({
				select: () => ({
					eq: (col: string, val: string) => ({
						maybeSingle: () => {
							const row = rows[val];
							if (table !== "spotify_oauth_states" || col !== "state" || !row)
								return Promise.resolve({ data: null, error: null });
							return Promise.resolve({ data: { state: val, ...row }, error: null });
						},
					}),
				}),
				delete: () => ({
					eq: (_col: string, val: string) => {
						deleted.push(val);
						delete rows[val];
						return Promise.resolve({ error: null });
					},
				}),
			}),
		} as never,
	};
}

describe("oauth", () => {
	test("buildAuthorizeUrl contém S256, escopos e redirect exato", () => {
		const url = new URL(
			buildAuthorizeUrl({
				clientId: "cid",
				redirectUri: REDIRECT,
				scopes: SPOTIFY_SCOPES,
				state: "st",
				challenge: "ch",
			}),
		);
		expect(url.hostname).toBe("accounts.spotify.com");
		expect(url.searchParams.get("code_challenge_method")).toBe("S256");
		expect(url.searchParams.get("redirect_uri")).toBe(REDIRECT);
		expect(url.searchParams.get("state")).toBe("st");
		const scope = url.searchParams.get("scope") ?? "";
		for (const s of SPOTIFY_SCOPES) expect(scope.split(" ")).toContain(s);
	});

	test("consumeState com 11 minutos ⇒ 400 invalid_state", async () => {
		const { db } = memDb({
			old: {
				user_id: "u1",
				code_verifier: "v",
				created_at: new Date(NOW - 11 * 60_000).toISOString(),
			},
		});
		const err = await consumeState(db, "old", "u1", () => NOW).catch((e) => e);
		expect(err.status).toBe(400);
		expect(err.code).toBe("invalid_state");
		void STATE_TTL_MS;
	});

	test("state de outro usuário ⇒ 400 e linha não apagada", async () => {
		const mem = memDb({
			theirs: { user_id: "u2", code_verifier: "v", created_at: new Date(NOW).toISOString() },
		});
		const err = await consumeState(mem.db, "theirs", "u1", () => NOW).catch((e) => e);
		expect(err.status).toBe(400);
		expect(mem.deleted).not.toContain("theirs");
		// O dono ainda consegue usar
		const verifier = await consumeState(mem.db, "theirs", "u2", () => NOW);
		expect(verifier).toBe("v");
	});

	test("reutilizar o mesmo state ⇒ segundo uso falha", async () => {
		const mem = memDb({
			once: { user_id: "u1", code_verifier: "v", created_at: new Date(NOW).toISOString() },
		});
		await consumeState(mem.db, "once", "u1", () => NOW);
		const err = await consumeState(mem.db, "once", "u1", () => NOW).catch((e) => e);
		expect(err.status).toBe(400);
		expect(err.code).toBe("invalid_state");
	});
});
