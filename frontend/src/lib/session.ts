import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

export interface SessionUser {
  id: string;
  email: string | null;
}

/** Aceita só caminhos relativos internos; qualquer outra coisa cai em "/". */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  return value;
}

export const booksTag = (userId: string) => `books:${userId}`;
export const sessionsTag = (userId: string) => `sessions:${userId}`;

/** Sessão obrigatória: sem usuário, redireciona para /entrar. */
export async function requireUser(): Promise<{ user: SessionUser; accessToken: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/entrar");
  return { user: { id: user.id, email: user.email ?? null }, accessToken: session.access_token };
}

/** Sessão opcional: devolve null quando não há usuário (páginas públicas, proxy). */
export async function optionalUser(): Promise<{ user: SessionUser; accessToken: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  return { user: { id: user.id, email: user.email ?? null }, accessToken: session.access_token };
}
