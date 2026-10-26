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
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, body?.error ?? `A API respondeu ${res.status}`);
  }
  return res.json() as Promise<T>;
}
