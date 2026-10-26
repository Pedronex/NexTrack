import { ApiError } from "../lib/errors";
import { decrypt, encrypt } from "../lib/crypto";

export const EXPIRY_MARGIN_MS = 60_000;

export interface StoredConnection {
	accessTokenEnc: string;
	refreshTokenEnc: string;
	/** epoch ms */
	expiresAt: number;
	scope: string | null;
	expired: boolean;
}

export interface SpotifyStore {
	get(userId: string): Promise<StoredConnection | null>;
	save(userId: string, c: StoredConnection): Promise<void>;
	/** Gravação condicional: só grava se o refresh atual ainda é o esperado. */
	saveIfRefreshTokenIs(
		userId: string,
		expectedRefreshEnc: string,
		c: StoredConnection,
	): Promise<boolean>;
	markExpired(userId: string): Promise<void>;
}

export interface RefreshResult {
	accessToken: string;
	refreshToken?: string;
	expiresIn: number;
}

export interface TokenDeps {
	store: SpotifyStore;
	refresh: (refreshToken: string) => Promise<RefreshResult>;
	keyB64: string;
	now: () => number;
}

const notConnected = () => new ApiError(401, "spotify_not_connected", "Spotify não conectado");
const expired = () => new ApiError(401, "spotify_expired", "Sessão do Spotify expirada");

/**
 * Devolve um access token válido, renovando se preciso.
 * Renovação usa gravação condicional para não haver corrida entre chamadas simultâneas.
 */
export async function getValidAccessToken(deps: TokenDeps, userId: string): Promise<string> {
	const conn = await deps.store.get(userId);
	if (!conn) throw notConnected();
	if (conn.expired) throw expired();
	if (conn.expiresAt - deps.now() > EXPIRY_MARGIN_MS) {
		return decrypt(conn.accessTokenEnc, deps.keyB64);
	}

	let refreshed: RefreshResult;
	try {
		refreshed = await deps.refresh(await decrypt(conn.refreshTokenEnc, deps.keyB64));
	} catch (e) {
		if ((e as { code?: string } | null)?.code === "invalid_grant") {
			await deps.store.markExpired(userId);
			throw expired();
		}
		throw e;
	}

	const next: StoredConnection = {
		accessTokenEnc: await encrypt(refreshed.accessToken, deps.keyB64),
		refreshTokenEnc: refreshed.refreshToken
			? await encrypt(refreshed.refreshToken, deps.keyB64)
			: conn.refreshTokenEnc,
		expiresAt: deps.now() + refreshed.expiresIn * 1000,
		scope: conn.scope,
		expired: false,
	};
	const won = await deps.store.saveIfRefreshTokenIs(userId, conn.refreshTokenEnc, next);
	if (won) return refreshed.accessToken;
	// Outra chamada renovou primeiro: relê e usa o token vencedor.
	const current = await deps.store.get(userId);
	if (!current) throw notConnected();
	if (current.expired) throw expired();
	return decrypt(current.accessTokenEnc, deps.keyB64);
}
