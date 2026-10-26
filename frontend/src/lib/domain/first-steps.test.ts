import { describe, expect, test } from "vitest";
import { firstSteps, isFirstAccess } from "./first-steps";

describe("first-steps", () => {
  test("conta nova: três passos pendentes", () => {
    expect(firstSteps({ books: 0, sessions: 0, spotifyConnected: false })).toEqual([
      { id: "book", done: false },
      { id: "session", done: false },
      { id: "spotify", done: false },
    ]);
  });

  test("livro e Spotify concluídos", () => {
    expect(firstSteps({ books: 1, sessions: 0, spotifyConnected: true })).toEqual([
      { id: "book", done: true },
      { id: "session", done: false },
      { id: "spotify", done: true },
    ]);
  });

  test("isFirstAccess", () => {
    expect(isFirstAccess(0, 0)).toBe(true);
    expect(isFirstAccess(1, 0)).toBe(false);
    expect(isFirstAccess(0, 1)).toBe(false);
  });
});
