import { describe, expect, test } from "vitest";
import { parseAuthRedirectError } from "./auth-errors";

describe("parseAuthRedirectError", () => {
  test("e-mail do provedor sem verificação vira aviso informativo", () => {
    const notice = parseAuthRedirectError(
      "#error=access_denied&error_code=provider_email_needs_verification&error_description=Unverified+email+with+spotify.",
    );
    expect(notice?.tone).toBe("info");
    expect(notice?.message).toContain("e-mail de confirmação");
    expect(notice?.message).not.toContain("Unverified");
  });

  test("lê o erro também da query string", () => {
    const notice = parseAuthRedirectError("?erro=provedor&error_code=provider_email_needs_verification");
    expect(notice?.tone).toBe("info");
  });

  test("conta já existente com outro método", () => {
    const notice = parseAuthRedirectError("#error=server_error&error_code=email_exists");
    expect(notice?.tone).toBe("error");
    expect(notice?.message).toContain("Já existe uma conta");
  });

  test("limite de requisições", () => {
    expect(parseAuthRedirectError("#error_code=over_request_rate_limit")?.message).toContain("Muitas tentativas");
  });

  test("código desconhecido usa a mensagem genérica", () => {
    const notice = parseAuthRedirectError("#error=server_error&error_code=algo_novo&error_description=boom");
    expect(notice).toEqual({ tone: "error", message: "Falha no provedor. Tente de novo." });
  });

  test("erro=provedor sem código também é falha genérica", () => {
    expect(parseAuthRedirectError("?erro=provedor")).toEqual({
      tone: "error",
      message: "Falha no provedor. Tente de novo.",
    });
  });

  test("sem erro devolve null", () => {
    expect(parseAuthRedirectError("")).toBeNull();
    expect(parseAuthRedirectError("#access_token=abc")).toBeNull();
    expect(parseAuthRedirectError("?next=%2F")).toBeNull();
  });
});
