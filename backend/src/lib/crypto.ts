function b64encode(bytes: Uint8Array): string {
	let s = "";
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s);
}

function b64decode(s: string): Uint8Array {
	const bin = atob(s);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

async function importKey(keyB64: string): Promise<CryptoKey> {
	const raw = b64decode(keyB64);
	return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, "AES-GCM", false, [
		"encrypt",
		"decrypt",
	]);
}

/** Cifra com AES-GCM (IV aleatório de 12 bytes prefixado). Saída em base64. */
export async function encrypt(plain: string, keyB64: string): Promise<string> {
	const key = await importKey(keyB64);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ct = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
		key,
		new TextEncoder().encode(plain),
	);
	const out = new Uint8Array(12 + ct.byteLength);
	out.set(iv, 0);
	out.set(new Uint8Array(ct), 12);
	return b64encode(out);
}

/** Decifra (lança se adulterado ou chave errada). */
export async function decrypt(cipher: string, keyB64: string): Promise<string> {
	const key = await importKey(keyB64);
	const raw = b64decode(cipher);
	const iv = raw.slice(0, 12);
	const ct = raw.slice(12);
	const pt = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
		key,
		ct.buffer as ArrayBuffer,
	);
	return new TextDecoder().decode(pt);
}

/** Gera uma chave AES-256 nova em base64 (para TOKEN_ENCRYPTION_KEY). */
export async function generateKey(): Promise<string> {
	const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
		"encrypt",
		"decrypt",
	]);
	const raw = await crypto.subtle.exportKey("raw", key);
	return b64encode(new Uint8Array(raw));
}
