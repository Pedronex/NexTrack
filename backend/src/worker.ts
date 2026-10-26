import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { authPlugin } from "./auth/plugin";
import type { Env } from "./config/worker-env";
import { parseEnv } from "./config/worker-env";
import { userDb, serviceDb } from "./db/clients";
import { toErrorResponse } from "./lib/errors";
import { booksRoutes } from "./routes/books";
import type { RouteDeps } from "./routes/deps";
import { meRoutes } from "./routes/me";
import { spotifyRoutes } from "./routes/spotify";
import { sessionsRoutes } from "./routes/sessions";

export function buildApp(env: Env, deps?: Partial<RouteDeps>) {
	const full: RouteDeps = {
		env,
		db: deps?.db ?? ((token: string) => userDb(env, token)),
		getKey: deps?.getKey,
	};
	return new Elysia({ adapter: CloudflareAdapter, aot: false })
		.state("env", env)
		.onError(({ error, set }) => {
			const { status, body } = toErrorResponse(error);
			set.status = status;
			return body;
		})
		.get("/health", () => ({ ok: true }))
		.use(booksRoutes(full))
		.use(sessionsRoutes(full))
		.use(meRoutes({ ...full, service: () => serviceDb(env), now: () => Date.now() }))
		.use(
			spotifyRoutes({ ...full, service: () => serviceDb(env), now: () => Date.now() }),
		);
}

export default {
	fetch(request: Request, env: unknown) {
		const parsed = parseEnv(env);
		return buildApp(parsed).fetch(request);
	},
};
