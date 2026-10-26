import { describe, expect, test } from "vitest";
import { initialsOf } from "./initials";

describe("initialsOf", () => {
  test("duas iniciais maiúsculas", () => {
    expect(initialsOf("Pedro Silva")).toBe("PS");
  });

  test("nome único", () => {
    expect(initialsOf("pedro")).toBe("P");
  });

  test("vazio", () => {
    expect(initialsOf("  ")).toBe("?");
    expect(initialsOf("")).toBe("?");
  });
});
