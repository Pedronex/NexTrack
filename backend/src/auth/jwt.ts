import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { Env } from "../config/worker-env";
import { ApiError } from "../lib/errors";

export interface AuthUser {
	id: string;
	email: string | null;
	token: string;
}

export interface VerifyOptions {
	getKey: JWTVerifyGetKey;
	issuer: string;
}

const unauthorized = () => new ApiError(401, "unauthorized", "Sessão inválida");

/** Valida o JWT do Supabase (assinatura JWKS, iss, aud=authenticated, exp). */
export async function verifyAccessToken(
	token: string,
	opts: VerifyOptions,
): Promise<AuthUser> {
	if (!token) throw unauthorized();
	let payload: Record<string, unknown>;
	try {
		const verified = await jwtVerify(token, opts.getKey, {
			issuer: opts.issuer,
			audience: "authenticated",
		});
		payload = verified.payload as Record<string, unknown>;
	} catch {
		throw unauthorized();
	}
	const sub = payload.sub;
	if (typeof sub !== "string" || sub.length === 0) throw unauthorized();
	const email = typeof payload.email === "string" ? payload.email : null;
	return { id: sub, email, token };
}

/** Getter JWKS com cache, apontando para o projeto do Env. */
export function createJwksGetter(env: Env): JWTVerifyGetKey {
	return createRemoteJWKSet(
		new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
	);
}

/** Issuer esperado para o projeto do Env. */
export function issuerFor(env: Env): string {
	return `${env.SUPABASE_URL}/auth/v1`;
}
