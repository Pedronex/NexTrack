import { describe, expect, test } from "bun:test";
import { decrypt, encrypt, generateKey } from "./crypto";

describe("crypto AES-GCM", () => {
	test("round-trip", async () => {
		const key = await generateKey();
		expect(await decrypt(await encrypt("refresh-token-abc", key), key)).toBe(
			"refresh-token-abc",
		);
	});

	test("dois encrypts do mesmo texto diferem (IV aleatório)", async () => {
		const key = await generateKey();
		const a = await encrypt("mesmo", key);
		const b = await encrypt("mesmo", key);
		expect(a).not.toBe(b);
	});

	test("texto adulterado lança", async () => {
		const key = await generateKey();
		const cipher = await encrypt("segredo", key);
		const tampered = (cipher[0] === "A" ? "B" : "A") + cipher.slice(1);
		await expect(decrypt(tampered, key)).rejects.toThrow();
	});

	test("chave errada lança", async () => {
		const a = await generateKey();
		const b = await generateKey();
		const cipher = await encrypt("segredo", a);
		await expect(decrypt(cipher, b)).rejects.toThrow();
	});
});
