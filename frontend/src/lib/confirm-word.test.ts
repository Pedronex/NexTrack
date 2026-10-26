import { describe, expect, test } from "vitest";
import { isDeleteConfirmed } from "./confirm-word";

describe("isDeleteConfirmed", () => {
  test("aceita EXCLUIR com espaços nas pontas", () => {
    expect(isDeleteConfirmed("EXCLUIR")).toBe(true);
    expect(isDeleteConfirmed(" EXCLUIR ")).toBe(true);
  });

  test("rejeita variações", () => {
    expect(isDeleteConfirmed("excluir")).toBe(false);
    expect(isDeleteConfirmed("EXCLUI")).toBe(false);
    expect(isDeleteConfirmed("")).toBe(false);
  });
});
