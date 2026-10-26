import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpotifyStore, StoredConnection } from "./tokens";

interface ConnectionRow {
	user_id: string;
	access_token_enc: string;
	refresh_token_enc: string;
	expires_at: string;
	scope: string | null;
	spotify_user_id: string | null;
	spotify_name: string | null;
	product: string | null;
	status: string;
	connected_at: string;
}

function toStored(row: ConnectionRow): StoredConnection {
	return {
		accessTokenEnc: row.access_token_enc,
		refreshTokenEnc: row.refresh_token_enc,
		expiresAt: Date.parse(row.expires_at),
		scope: row.scope,
		expired: row.status === "expired",
	};
}

/** SpotifyStore sobre public.spotify_connections (acesso via service_role). */
export function createSpotifyStore(db: SupabaseClient): SpotifyStore {
	return {
		async get(userId) {
			const { data, error } = await db
				.from("spotify_connections")
				.select("*")
				.eq("user_id", userId)
				.maybeSingle();
			if (error || !data) return null;
			return toStored(data as ConnectionRow);
		},
		async save(userId, c) {
			const { error } = await db.from("spotify_connections").upsert(
				{
					user_id: userId,
					access_token_enc: c.accessTokenEnc,
					refresh_token_enc: c.refreshTokenEnc,
					expires_at: new Date(c.expiresAt).toISOString(),
					scope: c.scope,
					status: c.expired ? "expired" : "connected",
					connected_at: new Date().toISOString(),
				},
				{ onConflict: "user_id" },
			);
			if (error) throw error;
		},
		async saveIfRefreshTokenIs(userId, expectedRefreshEnc, c) {
			const { data, error } = await db
				.from("spotify_connections")
				.update({
					access_token_enc: c.accessTokenEnc,
					refresh_token_enc: c.refreshTokenEnc,
					expires_at: new Date(c.expiresAt).toISOString(),
					scope: c.scope,
					status: "connected",
				})
				.eq("user_id", userId)
				.eq("refresh_token_enc", expectedRefreshEnc)
				.select("user_id");
			if (error) throw error;
			return (data as unknown[] | null)?.length === 1;
		},
		async markExpired(userId) {
			const { error } = await db
				.from("spotify_connections")
				.update({ status: "expired" })
				.eq("user_id", userId);
			if (error) throw error;
		},
	};
}
