import Elysia from "elysia";
import type { SupabaseClient } from "@supabase/supabase-js";
import z from "zod";
import { authPlugin, type AuthUser } from "../auth/plugin";
import type { Env } from "../config/worker-env";
import { decrypt, encrypt } from "../lib/crypto";
import { ApiError } from "../lib/errors";
import { buildAuthorizeUrl, consumeState, createState, SPOTIFY_SCOPES } from "../spotify/oauth";
import { createSpotifyStore } from "../spotify/store";
import { getValidAccessToken, type RefreshResult, type SpotifyStore } from "../spotify/tokens";
import type { RouteDeps } from "./deps";

export interface SpotifyDeps extends RouteDeps {
	service: () => SupabaseClient;
	now: () => number;
	/** Permite injetar fetch nos testes. */
	spotifyFetch?: typeof fetch;
}

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";

interface TokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	scope?: string;
	error?: string;
}

function spotifyCfg(env: Env) {
	return {
		clientId: env.SPOTIFY_CLIENT_ID,
		clientSecret: env.SPOTIFY_CLIENT_SECRET,
		redirectUri: env.SPOTIFY_REDIRECT_URI,
		scopes: SPOTIFY_SCOPES,
	};
}

async function requestToken(
	deps: SpotifyDeps,
	body: Record<string, string>,
): Promise<TokenResponse> {
	const doFetch = deps.spotifyFetch ?? fetch;
	const basic = btoa(`${deps.env.SPOTIFY_CLIENT_ID}:${deps.env.SPOTIFY_CLIENT_SECRET}`);
	const res = await doFetch(`${ACCOUNTS}/api/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${basic}`,
		},
		body: new URLSearchParams(body),
	});
	const json = (await res.json().catch(() => ({}))) as TokenResponse;
	if (!res.ok) {
		const err = new Error(`Falha no token do Spotify: ${json.error ?? res.status}`) as Error & {
			code?: string;
		};
		if (json.error === "invalid_grant") err.code = "invalid_grant";
		throw err;
	}
	return json;
}

async function spotifyMe(accessToken: string, doFetch: typeof fetch) {
	const res = await doFetch(`${API}/me`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) throw new ApiError(502, "spotify_error", `Spotify respondeu ${res.status}`);
	return (await res.json()) as { id?: string; display_name?: string; product?: string };
}

/** Chama a Web API com o token do usuário. 204 ⇒ null. 401 persistente ⇒ expira a conexão. */
async function userSpotifyFetch<T>(
	deps: SpotifyDeps,
	store: SpotifyStore,
	user: AuthUser,
	path: string,
	init: RequestInit = {},
): Promise<T | null> {
	const doFetch = deps.spotifyFetch ?? fetch;
	const call = async (forceRefresh: boolean) => {
		// Força renovação chamando com margem zerada quando necessário (via segundo passe).
		void forceRefresh;
		const token = await getValidAccessToken(
			{
				store,
				refresh: (rt) =>
					requestToken(deps, {
						grant_type: "refresh_token",
						refresh_token: rt,
					}).then((t) => ({
						accessToken: t.access_token,
						refreshToken: t.refresh_token,
						expiresIn: t.expires_in,
					} satisfies RefreshResult)),
				keyB64: deps.env.TOKEN_ENCRYPTION_KEY,
				now: deps.now,
			},
			user.id,
		);
		return doFetch(`${API}${path}`, {
			...init,
			headers: {
				...init.headers,
				Authorization: `Bearer ${token}`,
				...(init.body ? { "Content-Type": "application/json" } : {}),
			},
		});
	};

	let res = await call(false);
	if (res.status === 401) {
		// Token pode ter sido revogado no Spotify: tenta renovar explicitamente.
		try {
			const conn = await store.get(user.id);
			if (conn && !conn.expired) {
				const rt = await decrypt(conn.refreshTokenEnc, deps.env.TOKEN_ENCRYPTION_KEY);
				const t = await requestToken(deps, { grant_type: "refresh_token", refresh_token: rt });
				await store.save(user.id, {
					accessTokenEnc: await encrypt(t.access_token, deps.env.TOKEN_ENCRYPTION_KEY),
					refreshTokenEnc: t.refresh_token
						? await encrypt(t.refresh_token, deps.env.TOKEN_ENCRYPTION_KEY)
						: conn.refreshTokenEnc,
					expiresAt: deps.now() + t.expires_in * 1000,
					scope: conn.scope,
					expired: false,
				});
				res = await call(false);
			}
		} catch {
			// segue para o tratamento de erro abaixo
		}
		if (res.status === 401) {
			await store.markExpired(user.id);
			throw new ApiError(401, "spotify_expired", "Sessão do Spotify expirada");
		}
	}
	if (res.status === 204) return null;
	if (!res.ok) {
		const err = (await res.json().catch(() => null)) as {
			error?: { message?: string };
		} | null;
		const passthrough = [400, 403, 404, 429].includes(res.status);
		throw new ApiError(
			passthrough ? res.status : 502,
			"spotify_error",
			err?.error?.message ?? `Spotify respondeu ${res.status}`,
		);
	}
	const text = await res.text();
	try {
		return text ? (JSON.parse(text) as T) : null;
	} catch {
		return null;
	}
}

async function saveConnection(
	deps: SpotifyDeps,
	userId: string,
	tokens: { accessToken: string; refreshToken: string; expiresIn: number; scope?: string },
	profile: { id?: string; display_name?: string; product?: string },
) {
	const store = createSpotifyStore(deps.service());
	await store.save(userId, {
		accessTokenEnc: await encrypt(tokens.accessToken, deps.env.TOKEN_ENCRYPTION_KEY),
		refreshTokenEnc: await encrypt(tokens.refreshToken, deps.env.TOKEN_ENCRYPTION_KEY),
		expiresAt: deps.now() + tokens.expiresIn * 1000,
		scope: tokens.scope ?? null,
		expired: false,
	});
	// Completa nome/plano quando conhecidos (upsert parcial via update direto).
	if (profile.id || profile.display_name || profile.product) {
		await deps.service().from("spotify_connections").update({
			spotify_user_id: profile.id ?? null,
			spotify_name: profile.display_name ?? null,
			product: profile.product ?? null,
		}).eq("user_id", userId);
	}
}

const deviceQuery = z.object({ deviceId: z.string().optional() });
const withDevice = (deviceId?: string) =>
	deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";

export function spotifyRoutes(deps: SpotifyDeps) {
	const auth = deps.getKey ? authPlugin(deps.env, deps.getKey) : authPlugin(deps.env);
	const storeFor = () => createSpotifyStore(deps.service());
	return new Elysia().use(auth).post("/spotify/connect", async ({ user }) => {
		const { url } = await createState(deps.service(), spotifyCfg(deps.env), user.id, deps.now);
		return { url };
	}).post(
		"/spotify/callback",
		async ({ user, body }) => {
			const verifier = await consumeState(deps.service(), body.state, user.id, deps.now);
			const t = await requestToken(deps, {
				grant_type: "authorization_code",
				code: body.code,
				redirect_uri: deps.env.SPOTIFY_REDIRECT_URI,
				code_verifier: verifier,
			});
			if (!t.refresh_token)
				throw new ApiError(502, "spotify_error", "Spotify não devolveu refresh_token");
			const profile = await spotifyMe(t.access_token, deps.spotifyFetch ?? fetch);
			await saveConnection(
				deps,
				user.id,
				{
					accessToken: t.access_token,
					refreshToken: t.refresh_token,
					expiresIn: t.expires_in,
					scope: t.scope,
				},
				profile,
			);
			return { connected: true };
		},
		{ body: z.object({ code: z.string().min(1), state: z.string().min(1) }) },
	).post(
		"/spotify/connection",
		async ({ user, body, set }) => {
			const profile = await spotifyMe(body.accessToken, deps.spotifyFetch ?? fetch);
			await saveConnection(
				deps,
				user.id,
				{
					accessToken: body.accessToken,
					refreshToken: body.refreshToken,
					expiresIn: body.expiresIn,
					scope: SPOTIFY_SCOPES.join(" "),
				},
				profile,
			);
			set.status = 201;
			return { connected: true };
		},
		{
			body: z.object({
				accessToken: z.string().min(1),
				refreshToken: z.string().min(1),
				expiresIn: z.number().int().min(1),
			}),
		},
	).get("/spotify/status", async ({ user }) => {
		const conn = await storeFor().get(user.id);
		if (!conn) return { connected: false, status: "disconnected" as const };
		if (conn.expired) return { connected: false, status: "expired" as const };
		const { data } = await deps.service().from("spotify_connections").select("*").eq("user_id", user.id).maybeSingle() as unknown as {
			data: {
				spotify_name: string | null;
				product: string | null;
				connected_at: string;
			} | null;
		};
		let devices: unknown[] = [];
		try {
			devices = ((await userSpotifyFetch<{ devices?: unknown[] }>(deps, storeFor(), user, "/me/player/devices"))?.devices as unknown[]) ?? [];
		} catch {
			devices = [];
		}
		return {
			connected: true,
			status: "connected" as const,
			name: data?.spotify_name ?? null,
			product: data?.product ?? null,
			connectedAt: data?.connected_at ?? null,
			devices,
		};
	}).delete("/spotify/connection", async ({ user }) => {
		await deps.service().from("spotify_connections").delete().eq("user_id", user.id);
		return { ok: true };
	}).get("/spotify/currently-playing", async ({ user }) => {
		return (await userSpotifyFetch(deps, storeFor(), user, "/me/player/currently-playing")) ?? { active: false };
	}).get("/spotify/devices", async ({ user }) => {
		return userSpotifyFetch(deps, storeFor(), user, "/me/player/devices");
	}).put(
		"/spotify/play",
		async ({ user, body, query }) => {
			await userSpotifyFetch(deps, storeFor(), user, `/me/player/play${withDevice(query.deviceId)}`, {
				method: "PUT",
				body: body ? JSON.stringify({ context_uri: body.contextUri, uris: body.uris }) : undefined,
			});
			return { ok: true };
		},
		{
			query: deviceQuery,
			body: z.object({ contextUri: z.string().optional(), uris: z.array(z.string()).optional() }).optional(),
		},
	).put(
		"/spotify/pause",
		async ({ user, query }) => {
			await userSpotifyFetch(deps, storeFor(), user, `/me/player/pause${withDevice(query.deviceId)}`, {
				method: "PUT",
			});
			return { ok: true };
		},
		{ query: deviceQuery },
	).post(
		"/spotify/next",
		async ({ user, query }) => {
			await userSpotifyFetch(deps, storeFor(), user, `/me/player/next${withDevice(query.deviceId)}`, {
				method: "POST",
			});
			return { ok: true };
		},
		{ query: deviceQuery },
	).post(
		"/spotify/previous",
		async ({ user, query }) => {
			await userSpotifyFetch(deps, storeFor(), user, `/me/player/previous${withDevice(query.deviceId)}`, {
				method: "POST",
			});
			return { ok: true };
		},
		{ query: deviceQuery },
	);
}

export { buildAuthorizeUrl };
