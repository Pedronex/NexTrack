import { describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const exchange = vi.fn();
const getSession = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { exchangeCodeForSession: exchange, getSession } }),
}));

import { GET } from "./route";

function req(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

describe("GET /auth/callback", () => {
  test("next externo ⇒ redireciona para /", async () => {
    exchange.mockResolvedValueOnce({ error: null });
    getSession.mockResolvedValueOnce({ data: { session: null } });
    const res = await GET(req("/auth/callback?code=abc&next=https://evil.com"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  test("next interno ⇒ redireciona para ele", async () => {
    exchange.mockResolvedValueOnce({ error: null });
    getSession.mockResolvedValueOnce({ data: { session: null } });
    const res = await GET(req("/auth/callback?code=abc&next=/biblioteca"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/biblioteca");
  });

  test("troca com erro ⇒ /entrar?erro=provedor", async () => {
    exchange.mockResolvedValueOnce({ error: new Error("bad") });
    const res = await GET(req("/auth/callback?code=ruim"));
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/entrar");
    expect(location.searchParams.get("erro")).toBe("provedor");
  });

  test("sem code ⇒ /entrar?erro=provedor", async () => {
    const res = await GET(req("/auth/callback"));
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/entrar");
    expect(location.searchParams.get("erro")).toBe("provedor");
  });
});
