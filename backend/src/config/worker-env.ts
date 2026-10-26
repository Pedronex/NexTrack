import z from "zod";

const WORKER_ENV_SCHEMA = z.object({
	SUPABASE_URL: z.string().min(1),
	SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
	SPOTIFY_CLIENT_ID: z.string().min(1),
	SPOTIFY_CLIENT_SECRET: z.string().min(1),
	SPOTIFY_REDIRECT_URI: z.string().min(1),
	TOKEN_ENCRYPTION_KEY: z.string().min(1),
});

export type Env = z.infer<typeof WORKER_ENV_SCHEMA>;

/** Valida os bindings do Worker; lança listando variáveis ausentes, sem imprimir valores. */
export function parseEnv(raw: unknown): Env {
	const parsed = WORKER_ENV_SCHEMA.safeParse(raw);
	if (!parsed.success) {
		const missing = parsed.error.issues.map((i) => i.path.join(".")).filter(Boolean);
		const names = missing.length > 0 ? missing.join(", ") : "variáveis de ambiente";
		throw new Error(`Variáveis de ambiente ausentes ou inválidas: ${names}`);
	}
	return parsed.data;
}
