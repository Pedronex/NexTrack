import Elysia from "elysia";
import type { Env } from "../config/worker-env";
import { ApiError } from "../lib/errors";
import {
	createJwksGetter,
	issuerFor,
	verifyAccessToken,
	type AuthUser,
	type VerifyOptions,
} from "./jwt";

export type { AuthUser };

export interface AuthContext {
	user: AuthUser;
}

/**
 * Plugin Elysia (forma funcional: `(app) => app.derive(...)`).
 * Lê `Authorization: Bearer`, valida e entrega `{ user }`. Sem token válido → 401.
 */
export function authPlugin(
	env: Env,
	getKey: VerifyOptions["getKey"] = createJwksGetter(env),
) {
	const issuer = issuerFor(env);
	return (app: Elysia) =>
		app.derive(async ({ headers }) => {
			const header = headers.authorization ?? headers.Authorization;
			const value = Array.isArray(header) ? header[0] : header;
			if (!value || !value.toLowerCase().startsWith("bearer ")) {
				throw new ApiError(401, "unauthorized", "Sessão inválida");
			}
			const token = value.slice(7).trim();
			const user: AuthUser = await verifyAccessToken(token, { getKey, issuer });
			return { user };
		});
}
