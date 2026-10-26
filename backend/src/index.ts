import { openapi } from "@elysiajs/openapi";
import { APIResponseError } from "@notionhq/client";
import { Elysia } from "elysia";
import { env } from "./config/env";
import { booksRoutes } from "./functions/books";
import { sessionsRoutes } from "./functions/sessions";
import { spotifyRoutes } from "./functions/spotify";
import { notionPlugin } from "./plugins/notion";
import { SpotifyError } from "./plugins/spotify";

const app = new Elysia()
	.use(openapi())
	.use(notionPlugin)
	.onError(({ error, set }) => {
		if (error instanceof SpotifyError) {
			set.status = error.status;
			return { error: error.message };
		}
		if (error instanceof APIResponseError) {
			console.error("[notion]", error.code, error.message);
			set.status =
				error.status === 404 ? 404 : error.code === "validation_error" ? 400 : 502;
			return { error: "Falha ao acessar a biblioteca" };
		}
	})
	.get("/health/notion", async ({ notion, notionIds }) => {
		await notion.dataSources.retrieve({ data_source_id: notionIds.books });
		return { ok: true };
	})
	.use(booksRoutes)
	.use(sessionsRoutes)
	.use(spotifyRoutes)
	.listen(env.PORT);

console.log(
	`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}/openapi`,
);
