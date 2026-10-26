import type { JWTVerifyGetKey } from "jose";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../config/worker-env";

export interface RouteDeps {
	env: Env;
	db: (token: string) => SupabaseClient;
	/** Injetado nos testes (JWKS local); produção usa o JWKS do Supabase. */
	getKey?: JWTVerifyGetKey;
}
