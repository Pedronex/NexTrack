import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import type { Env } from "./config/worker-env";
import { parseEnv } from "./config/worker-env";
import { toErrorResponse } from "./lib/errors";

const app = new Elysia({ adapter: CloudflareAdapter, aot: false })
	.state("env", {} as Env)
	.onError(({ error }) => {
		const { status, body } = toErrorResponse(error);
		return new Response(JSON.stringify(body), {
			status,
			headers: { "Content-Type": "application/json" },
		});
	})
	.get("/health", () => ({ ok: true }));

export default {
	fetch(request: Request, env: unknown) {
		app.store.env = parseEnv(env);
		return app.fetch(request);
	},
};

export { app };
