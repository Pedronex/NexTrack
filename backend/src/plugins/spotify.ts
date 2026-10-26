import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env";
import { tokenStore } from "./spotify-store";

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";
const SCOPES = [
	"user-read-playback-state",
	"user-modify-playback-state",
	"user-read-currently-playing",
].join(" ");
const EXPIRY_MARGIN_MS = 60_000;
const STATE_TTL_MS = 10 * 60_000;

const clientId = env.SPOTIFY_CLIENT_ID;
const redirectUri =
	env.SPOTIFY_REDIRECT_URI ?? `http://127.0.0.1:${env.PORT}/spotify/callback`;

export class SpotifyError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
	}
}

const b64url = (buf: Buffer) => buf.toString("base64url");

// state -> code_verifier dos logins em andamento
const pending = new Map<string, { verifier: string; createdAt: number }>();

export function buildAuthorizeUrl() {
	const verifier = b64url(randomBytes(64));
	const challenge = b64url(createHash("sha256").update(verifier).digest());
	const state = b64url(randomBytes(16));

	const now = Date.now();
	for (const [k, v] of pending)
		if (now - v.createdAt > STATE_TTL_MS) pending.delete(k);
	pending.set(state, { verifier, createdAt: now });

	const url = new URL(`${ACCOUNTS}/authorize`);
	url.search = new URLSearchParams({
		response_type: "code",
		client_id: clientId,
		scope: SCOPES,
		code_challenge_method: "S256",
		code_challenge: challenge,
		redirect_uri: redirectUri,
		state,
	}).toString();
	return url.toString();
}

interface TokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	scope?: string;
	error?: string;
}

async function requestToken(
	body: Record<string, string>,
): Promise<TokenResponse> {
	const res = await fetch(`${ACCOUNTS}/api/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(body),
	});
	const json = (await res.json().catch(() => ({}))) as TokenResponse;
	if (!res.ok) {
		const revoked = json.error === "invalid_grant";
		if (revoked) tokenStore.clear();
		throw new SpotifyError(
			revoked ? 401 : 502,
			`Falha no token do Spotify: ${json.error ?? res.status}`,
		);
	}
	return json;
}

export async function completeLogin(code: string, state: string) {
	const entry = pending.get(state);
	pending.delete(state);
	if (!entry || Date.now() - entry.createdAt > STATE_TTL_MS)
		throw new SpotifyError(400, "state inválido ou expirado");

	const t = await requestToken({
		client_id: clientId,
		grant_type: "authorization_code",
		code,
		redirect_uri: redirectUri,
		code_verifier: entry.verifier,
	});
	if (!t.refresh_token)
		throw new SpotifyError(502, "Spotify não devolveu refresh_token");
	tokenStore.save({
		accessToken: t.access_token,
		refreshToken: t.refresh_token,
		expiresAt: Date.now() + t.expires_in * 1000,
		scope: t.scope ?? null,
	});
}

async function getAccessToken(forceRefresh = false) {
	const stored = tokenStore.get();
	if (!stored) throw new SpotifyError(401, "Spotify não conectado");
	if (!forceRefresh && stored.expiresAt - Date.now() > EXPIRY_MARGIN_MS)
		return stored.accessToken;

	const t = await requestToken({
		client_id: clientId,
		grant_type: "refresh_token",
		refresh_token: stored.refreshToken,
	});
	tokenStore.save({
		accessToken: t.access_token,
		// o Spotify só devolve refresh_token novo às vezes
		refreshToken: t.refresh_token ?? stored.refreshToken,
		expiresAt: Date.now() + t.expires_in * 1000,
		scope: t.scope ?? stored.scope,
	});
	return t.access_token;
}

export const isConnected = () => tokenStore.get() !== null;
export const disconnect = () => tokenStore.clear();

/** Chama a Web API. Devolve null em 204. Renova o token e repete uma vez em 401. */
export async function spotifyFetch<T = unknown>(
	path: string,
	init: RequestInit = {},
): Promise<T | null> {
	const call = (token: string) =>
		fetch(`${API}${path}`, {
			...init,
			headers: {
				...init.headers,
				Authorization: `Bearer ${token}`,
				...(init.body ? { "Content-Type": "application/json" } : {}),
			},
		});

	let res = await call(await getAccessToken());
	if (res.status === 401) res = await call(await getAccessToken(true));

	if (res.status === 204) return null;
	if (!res.ok) {
		const err = (await res.json().catch(() => null)) as {
			error?: { message?: string };
		} | null;
		const passthrough = [400, 403, 404, 429].includes(res.status);
		throw new SpotifyError(
			passthrough ? res.status : 502,
			err?.error?.message ?? `Spotify respondeu ${res.status}`,
		);
	}
	// Os comandos de player (play/pause/next/previous) às vezes respondem 200
	// com um corpo que não é JSON (ex.: "fC84aUeA"). Nesse caso não há dado útil.
	const text = await res.text();
	try {
		return text ? (JSON.parse(text) as T) : null;
	} catch {
		return null;
	}
}
