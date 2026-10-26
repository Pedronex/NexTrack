import { describe, expect, test } from "vitest";
import { safeNextPath } from "./session";

describe("safeNextPath", () => {
  test("aceita caminho interno com query", () => {
    expect(safeNextPath("/biblioteca?x=1")).toBe("/biblioteca?x=1");
  });

  test("rejeita URLs externas e escapes", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });
});
