import { describe, expect, test } from "bun:test";
import {
	createLocalJWKSet,
	exportJWK,
	generateKeyPair,
	SignJWT,
} from "jose";
import { verifyAccessToken } from "./jwt";

const ISSUER = "https://oxuzoobstcjbsavxapua.supabase.co/auth/v1";

async function setup() {
	const { publicKey, privateKey } = await generateKeyPair("ES256");
	const { privateKey: otherPriv } = await generateKeyPair("ES256");
	const pubJwk = await exportJWK(publicKey);
	pubJwk.kid = "test-key";
	pubJwk.alg = "ES256";
	const getKey = createLocalJWKSet({ keys: [pubJwk] });
	return { privateKey, otherPriv, getKey };
}

describe("verifyAccessToken", () => {
	test("aceita token válido e devolve id = sub", async () => {
		const { privateKey, getKey } = await setup();
		const token = await new SignJWT({ role: "authenticated" })
			.setProtectedHeader({ alg: "ES256", kid: "test-key" })
			.setSubject("user-123")
			.setAudience("authenticated")
			.setIssuer(ISSUER)
			.setExpirationTime("2h")
			.sign(privateKey);
		const user = await verifyAccessToken(token, { getKey, issuer: ISSUER });
		expect(user.id).toBe("user-123");
		expect(user.token).toBe(token);
	});

	test("rejeita expirado, aud/iss errados, outra chave, token vazio", async () => {
		const { privateKey, otherPriv, getKey } = await setup();
		const base = () =>
			new SignJWT({ role: "authenticated" })
				.setProtectedHeader({ alg: "ES256", kid: "test-key" })
				.setSubject("u1")
				.setAudience("authenticated")
				.setIssuer(ISSUER);

		const expired = await base().setExpirationTime("-1h").sign(privateKey);
		await expect(verifyAccessToken(expired, { getKey, issuer: ISSUER })).rejects.toMatchObject({
			status: 401,
		});

		const badAud = await base().setAudience("anon").setExpirationTime("1h").sign(privateKey);
		await expect(verifyAccessToken(badAud, { getKey, issuer: ISSUER })).rejects.toMatchObject({
			status: 401,
		});

		const badIss = await base()
			.setIssuer("https://evil.example/auth/v1")
			.setExpirationTime("1h")
			.sign(privateKey);
		await expect(verifyAccessToken(badIss, { getKey, issuer: ISSUER })).rejects.toMatchObject({
			status: 401,
		});

		const otherKey = await base().setExpirationTime("1h").sign(otherPriv);
		await expect(verifyAccessToken(otherKey, { getKey, issuer: ISSUER })).rejects.toMatchObject({
			status: 401,
		});

		await expect(verifyAccessToken("", { getKey, issuer: ISSUER })).rejects.toMatchObject({
			status: 401,
		});
		await expect(
			verifyAccessToken("not-a-jwt", { getKey, issuer: ISSUER }),
		).rejects.toMatchObject({ status: 401 });
	});
});
