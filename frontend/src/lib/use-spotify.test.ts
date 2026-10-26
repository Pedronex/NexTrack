import { describe, expect, test } from "vitest";
import { shouldPoll } from "./use-spotify";

describe("shouldPoll", () => {
  test("aba oculta nunca consulta", () => {
    expect(shouldPoll("hidden", "playing")).toBe(false);
  });

  test("aba visível com reprodução consulta", () => {
    expect(shouldPoll("visible", "playing")).toBe(true);
  });

  test("desconectado ou expirado não consulta", () => {
    expect(shouldPoll("visible", "disconnected")).toBe(false);
    expect(shouldPoll("visible", "expired")).toBe(false);
  });
});
