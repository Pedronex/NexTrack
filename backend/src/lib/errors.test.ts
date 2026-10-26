import { describe, expect, test } from "bun:test";
import { parseEnv } from "../config/worker-env";
import { ApiError, toErrorResponse } from "./errors";

describe("toErrorResponse", () => {
	test("ApiError preserva status, code e mensagem", () => {
		const res = toErrorResponse(new ApiError(404, "not_found", "Livro não encontrado"));
		expect(res.status).toBe(404);
		expect(res.body).toEqual({ error: "Livro não encontrado", code: "not_found" });
	});

	test("erro desconhecido vira 500 sem vazar detalhes", () => {
		const res = toErrorResponse(new Error("senha=abc secreta"));
		expect(res.status).toBe(500);
		expect(res.body.code).toBe("internal_error");
		expect(res.body.error).not.toContain("senha");
		expect(res.body.error).not.toContain("abc");
	});
});

describe("parseEnv", () => {
	test("falta de variáveis lança listando nomes sem valores", () => {
		let message = "";
		try {
			parseEnv({});
		} catch (e) {
			message = e instanceof Error ? e.message : String(e);
		}
		expect(message).toContain("SUPABASE_URL");
		expect(message).not.toContain("abc");
	});
});
