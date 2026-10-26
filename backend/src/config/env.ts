import z from "zod";

const ENV_SCHEMA = z.object({
	NOTION_TOKEN: z.string(),
	NOTION_BOOKS_DATA_SOURCE_ID: z.string(),
	NOTION_SESSIONS_DATA_SOURCE_ID: z.string(),

	SPOTIFY_CLIENT_ID: z.string(),
	SPOTIFY_CLIENT_SECRET: z.string(),
	// Precisa estar cadastrada exatamente igual no Spotify Developer Dashboard.
	SPOTIFY_REDIRECT_URI: z.string().optional(),

	// PORT
	PORT: z.coerce.number().default(3000),
});

export const env = ENV_SCHEMA.parse(process.env);
