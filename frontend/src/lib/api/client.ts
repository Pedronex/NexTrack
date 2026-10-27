import "server-only";
import { redirect } from "next/navigation";

const API_URL = process.env.API_URL;
if (!API_URL) {
  throw new Error("Variável de ambiente API_URL não definida");
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function parseJson(text: string): { error?: string } | null {
  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    return null;
  }
}

export async function api<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...rest.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) redirect("/entrar");
  if (res.status === 204) return null as T;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const body = parseJson(text);
    if (!body?.error) {
      // Resposta que não veio do Worker (ex.: bloqueio do Cloudflare): registra pistas, sem tokens.
      console.error("[api] resposta sem corpo de erro da API", {
        status: res.status,
        path,
        server: res.headers.get("server"),
        mitigated: res.headers.get("cf-mitigated"),
        snippet: text.slice(0, 120),
      });
    }
    throw new ApiError(res.status, body?.error ?? `A API respondeu ${res.status}`);
  }
  return res.json() as Promise<T>;
}
