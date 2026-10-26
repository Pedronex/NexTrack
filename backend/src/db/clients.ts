import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../config/worker-env";

/** Cliente com o token do usuário: o RLS vale. Uma instância por requisição. */
export function userDb(env: Env, token: string): SupabaseClient {
	return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
		global: { headers: { Authorization: `Bearer ${token}` } },
		auth: { persistSession: false, autoRefreshToken: false },
	});
}

/** Cliente de serviço: só para tabelas do Spotify e exclusão de conta. Nunca no frontend. */
export function serviceDb(env: Env): SupabaseClient {
	return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
}
