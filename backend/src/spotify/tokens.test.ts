import { describe, expect, test } from "bun:test";
import { decrypt, encrypt, generateKey } from "../lib/crypto";
import {
	getValidAccessToken,
	type RefreshResult,
	type SpotifyStore,
	type StoredConnection,
} from "./tokens";

const NOW = 1_700_000_000_000;

async function connFor(
	key: string,
	opts: { access: string; refresh: string; expiresAt: number; expired?: boolean },
): Promise<StoredConnection> {
	return {
		accessTokenEnc: await encrypt(opts.access, key),
		refreshTokenEnc: await encrypt(opts.refresh, key),
		expiresAt: opts.expiresAt,
		scope: "s",
		expired: opts.expired ?? false,
	};
}

function memStore(initial: StoredConnection | null): SpotifyStore & { calls: string[] } {
	let current = initial;
	const calls: string[] = [];
	return {
		calls,
		get: async () => {
			calls.push("get");
			return current;
		},
		save: async (_u, c) => {
			calls.push("save");
			current = c;
		},
		saveIfRefreshTokenIs: async (_u, expected, c) => {
			calls.push("saveIf");
			if (current && current.refreshTokenEnc === expected) {
				current = c;
				return true;
			}
			return false;
		},
		markExpired: async () => {
			calls.push("markExpired");
			if (current) current = { ...current, expired: true };
		},
	};
}

describe("getValidAccessToken", () => {
	test("token válido é devolvido sem refresh", async () => {
		const key = await generateKey();
		const store = memStore(
			await connFor(key, { access: "A1", refresh: "R1", expiresAt: NOW + 3600_000 }),
		);
		let refreshes = 0;
		const token = await getValidAccessToken(
			{
				store,
				refresh: async () => {
					refreshes += 1;
					return { accessToken: "NEW", expiresIn: 3600 } satisfies RefreshResult;
				},
				keyB64: key,
				now: () => NOW,
			},
			"u1",
		);
		expect(token).toBe("A1");
		expect(refreshes).toBe(0);
	});

	test("token a vencer renova e grava condicionalmente", async () => {
		const key = await generateKey();
		const store = memStore(
			await connFor(key, { access: "OLD", refresh: "R1", expiresAt: NOW + 10_000 }),
		);
		const token = await getValidAccessToken(
			{
				store,
				refresh: async () => ({ accessToken: "NEW", refreshToken: "R2", expiresIn: 3600 }),
				keyB64: key,
				now: () => NOW,
			},
			"u1",
		);
		expect(token).toBe("NEW");
		expect(store.calls).toContain("saveIf");
		// Segunda chamada usa o token novo sem renovar
		const again = await getValidAccessToken(
			{ store, refresh: async () => ({ accessToken: "NEVER", expiresIn: 1 }), keyB64: key, now: () => NOW },
			"u1",
		);
		expect(again).toBe("NEW");
	});

	test("duas chamadas simultâneas: resultado consistente", async () => {
		const key = await generateKey();
		const store = memStore(
			await connFor(key, { access: "OLD", refresh: "R1", expiresAt: NOW - 1 }),
		);
		let refreshes = 0;
		const deps = {
			store,
			refresh: async () => {
				refreshes += 1;
				await new Promise((r) => setTimeout(r, 10));
				return { accessToken: `NEW${refreshes}`, expiresIn: 3600 } satisfies RefreshResult;
			},
			keyB64: key,
			now: () => NOW,
		};
		const [a, b] = await Promise.all([
			getValidAccessToken(deps, "u1"),
			getValidAccessToken(deps, "u1"),
		]);
		expect(a).toBe(b);
		expect(a).toMatch(/^NEW/);
		const stored = await store.get("u1");
		expect(await decrypt(stored!.accessTokenEnc, key)).toBe(a);
	});

	test("invalid_grant marca expirado e lança spotify_expired", async () => {
		const key = await generateKey();
		const store = memStore(
			await connFor(key, { access: "OLD", refresh: "R1", expiresAt: NOW - 1 }),
		);
		const err = await getValidAccessToken(
			{
				store,
				refresh: async () => {
					const e = new Error("revoked") as Error & { code: string };
					e.code = "invalid_grant";
					throw e;
				},
				keyB64: key,
				now: () => NOW,
			},
			"u1",
		).catch((e) => e);
		expect(err.code).toBe("spotify_expired");
		expect(store.calls).toContain("markExpired");
	});

	test("conexão expirada lança sem chamar refresh", async () => {
		const key = await generateKey();
		const store = memStore(
			await connFor(key, { access: "OLD", refresh: "R1", expiresAt: NOW + 3600_000, expired: true }),
		);
		let refreshes = 0;
		const err = await getValidAccessToken(
			{
				store,
				refresh: async () => {
					refreshes += 1;
					return { accessToken: "X", expiresIn: 1 };
				},
				keyB64: key,
				now: () => NOW,
			},
			"u1",
		).catch((e) => e);
		expect(err.code).toBe("spotify_expired");
		expect(refreshes).toBe(0);
	});

	test("sem conexão ⇒ spotify_not_connected", async () => {
		const key = await generateKey();
		const store = memStore(null);
		const err = await getValidAccessToken(
			{ store, refresh: async () => ({ accessToken: "X", expiresIn: 1 }), keyB64: key, now: () => NOW },
			"u1",
		).catch((e) => e);
		expect(err.code).toBe("spotify_not_connected");
	});
});
