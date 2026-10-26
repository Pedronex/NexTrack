import { NextResponse, type NextRequest } from "next/server";
import { optionalUser } from "@/lib/session";

const API_URL = process.env.API_URL;

/** Repassa /api/spotify/* ao Worker com o Bearer da sessão (o navegador nunca fala com o Worker). */
async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await optionalUser();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { path } = await params;
  const url = `${API_URL}/spotify/${path.join("/")}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const res = await fetch(url, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? await request.arrayBuffer() : undefined,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export const GET = proxy;
export const PUT = proxy;
export const POST = proxy;
export const DELETE = proxy;
