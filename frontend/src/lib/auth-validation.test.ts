import { describe, expect, test } from "vitest";
import {
  passwordStrength,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
} from "./auth-validation";

describe("auth-validation", () => {
  test("validateEmail", () => {
    expect(validateEmail("")).toContain("e-mail");
    expect(validateEmail("sem-arroba")).toContain("válido");
    expect(validateEmail("a@b.co")).toBeNull();
  });

  test("validatePassword exige mínimo de 8", () => {
    expect(validatePassword("")).toContain("senha");
    expect(validatePassword("1234567")).toContain("8 caracteres");
    expect(validatePassword("12345678")).toBeNull();
  });

  test("passwordStrength varia de fraca a muito forte", () => {
    expect(passwordStrength("abc")).toBeLessThanOrEqual(1);
    expect(passwordStrength("Abcdef12!xyz")).toBe(4);
  });

  test("validatePasswordMatch", () => {
    expect(validatePasswordMatch("a", "b")).toBe("As senhas não conferem.");
    expect(validatePasswordMatch("abcdefg1", "abcdefg1")).toBeNull();
  });
});
