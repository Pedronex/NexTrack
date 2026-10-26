import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

mkdirSync("data", { recursive: true });

const db = new Database("data/spotify.db", { create: true });
db.run(`
	CREATE TABLE IF NOT EXISTS spotify_tokens (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		access_token TEXT NOT NULL,
		refresh_token TEXT NOT NULL,
		expires_at INTEGER NOT NULL,
		scope TEXT
	)
`);

export interface StoredTokens {
	accessToken: string;
	refreshToken: string;
	expiresAt: number; // epoch ms
	scope: string | null;
}

interface Row {
	access_token: string;
	refresh_token: string;
	expires_at: number;
	scope: string | null;
}

export const tokenStore = {
	get(): StoredTokens | null {
		const row = db
			.query<Row, []>("SELECT * FROM spotify_tokens WHERE id = 1")
			.get();
		return row
			? {
					accessToken: row.access_token,
					refreshToken: row.refresh_token,
					expiresAt: row.expires_at,
					scope: row.scope,
				}
			: null;
	},
	save(t: StoredTokens) {
		db.query(
			`INSERT INTO spotify_tokens (id, access_token, refresh_token, expires_at, scope)
			 VALUES (1, ?1, ?2, ?3, ?4)
			 ON CONFLICT(id) DO UPDATE SET
				access_token = excluded.access_token,
				refresh_token = excluded.refresh_token,
				expires_at = excluded.expires_at,
				scope = excluded.scope`,
		).run(t.accessToken, t.refreshToken, t.expiresAt, t.scope);
	},
	clear() {
		db.run("DELETE FROM spotify_tokens WHERE id = 1");
	},
};
