import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../lib/errors";

export const SPOTIFY_SCOPES = [
	"user-read-playback-state",
	"user-modify-playback-state",
	"user-read-currently-playing",
	"user-read-private",
];

export const STATE_TTL_MS = 10 * 60_000;

export interface OAuthConfig {
	clientId: string;
	redirectUri: string;
	scopes: string[];
}

function b64url(bytes: Uint8Array): string {
	let s = "";
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomB64url(nBytes: number): string {
	return b64url(crypto.getRandomValues(new Uint8Array(nBytes)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
	return b64url(new Uint8Array(digest));
}

export function buildAuthorizeUrl(params: {
	clientId: string;
	redirectUri: string;
	scopes: string[];
	state: string;
	challenge: string;
}): string {
	const url = new URL("https://accounts.spotify.com/authorize");
	url.search = new URLSearchParams({
		response_type: "code",
		client_id: params.clientId,
		scope: params.scopes.join(" "),
		code_challenge_method: "S256",
		code_challenge: params.challenge,
		redirect_uri: params.redirectUri,
		state: params.state,
	}).toString();
	return url.toString();
}

/** Gera state+verifier PKCE, persiste e devolve a URL de autorização. */
export async function createState(
	db: SupabaseClient,
	cfg: OAuthConfig,
	userId: string,
	now: () => number,
): Promise<{ state: string; url: string }> {
	const state = randomB64url(16);
	const verifier = randomB64url(64);
	const challenge = await pkceChallenge(verifier);
	const { error } = await db.from("spotify_oauth_states").insert({
		state,
		user_id: userId,
		code_verifier: verifier,
		created_at: new Date(now()).toISOString(),
	});
	if (error) throw error;
	return {
		state,
		url: buildAuthorizeUrl({
			clientId: cfg.clientId,
			redirectUri: cfg.redirectUri,
			scopes: cfg.scopes,
			state,
			challenge,
		}),
	};
}

interface StateRow {
	state: string;
	user_id: string;
	code_verifier: string;
	created_at: string;
}

const invalidState = () => new ApiError(400, "invalid_state", "state inválido ou expirado");

/** Consome o state (uso único) e devolve o code_verifier. */
export async function consumeState(
	db: SupabaseClient,
	state: string,
	userId: string,
	now: () => number,
): Promise<string> {
	const { data, error } = await db
		.from("spotify_oauth_states")
		.select("*")
		.eq("state", state)
		.maybeSingle();
	if (error || !data) throw invalidState();
	const row = data as StateRow;
	// Linha de outro usuário: não apaga, só rejeita.
	if (row.user_id !== userId) throw invalidState();
	if (now() - Date.parse(row.created_at) > STATE_TTL_MS) {
		await db.from("spotify_oauth_states").delete().eq("state", state);
		throw invalidState();
	}
	const { error: delError } = await db.from("spotify_oauth_states").delete().eq("state", state);
	if (delError) throw delError;
	return row.code_verifier;
}
