"use server";

import { ApiError } from "@/lib/api/client";
import {
  createBook,
  deleteBook,
  updateBook,
  updateProgress,
} from "@/lib/api/books";
import { disconnectSpotify, getSpotifyConnectUrl } from "@/lib/api/integrations";
import { createSession, getAllSessions } from "@/lib/api/sessions";
import { deleteMe, getMe, updateMe, type Me } from "@/lib/api/me";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Book, BookInput, ReadingSession, SessionInput, Status } from "@/lib/types";
import { redirect } from "next/navigation";
import { type Errors, hasErrors, validateBook, validateSession } from "@/lib/validation";

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const failure = (error: unknown): ActionResult<never> => ({
  ok: false,
  message: error instanceof ApiError ? error.message : "Não foi possível falar com a API.",
});

const invalid = (errors: Errors<object>): ActionResult<never> => ({
  ok: false,
  message: "Revise os campos destacados.",
  fieldErrors: errors as Record<string, string>,
});

export async function saveBookAction(id: string | null, input: BookInput): Promise<ActionResult<Book>> {
  const errors = validateBook(input);
  if (hasErrors(errors)) return invalid(errors);
  try {
    const book = id ? await updateBook(id, input) : await createBook(input);
    return { ok: true, data: book };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteBookAction(id: string): Promise<ActionResult> {
  try {
    await deleteBook(id);
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function updateProgressAction(
  id: string,
  currentPage: number,
  status?: Status,
): Promise<ActionResult<Book>> {
  if (!Number.isInteger(currentPage) || currentPage < 0) {
    return invalid({ currentPage: "Informe um número inteiro" });
  }
  try {
    const book = await updateProgress(id, currentPage, status);
    return { ok: true, data: book };
  } catch (error) {
    return failure(error);
  }
}

export async function createSessionAction(
  input: SessionInput,
  totalPages: number | null,
): Promise<ActionResult<ReadingSession & { book?: Book }>> {
  const errors = validateSession(input, { totalPages });
  if (hasErrors(errors)) return invalid(errors);
  try {
    const session = await createSession(input);
    return { ok: true, data: session };
  } catch (error) {
    return failure(error);
  }
}

export async function disconnectSpotifyAction(): Promise<ActionResult> {
  try {
    await disconnectSpotify();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function connectSpotifyAction(): Promise<never> {
  redirect(await getSpotifyConnectUrl());
}

export async function countBookSessionsAction(bookId: string): Promise<number> {
  const sessions = await getAllSessions().catch(() => []);
  return sessions.filter((s) => s.bookId === bookId).length;
}

export async function updateProfileAction(patch: {
  displayName?: string;
  yearlyGoal?: number;
  showMiniPlayer?: boolean;
}): Promise<ActionResult<Me>> {
  if (patch.yearlyGoal !== undefined && (!Number.isInteger(patch.yearlyGoal) || patch.yearlyGoal < 1)) {
    return { ok: false, message: "A meta precisa ser um número inteiro a partir de 1." };
  }
  try {
    return { ok: true, data: await updateMe(patch) };
  } catch (error) {
    return failure(error);
  }
}

export async function changePasswordAction(current: string, next: string): Promise<ActionResult> {
  if (!current) return { ok: false, message: "Informe sua senha atual." };
  if (next.length < 8) return { ok: false, message: "A nova senha precisa de pelo menos 8 caracteres." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { ok: false, message: "Sessão inválida. Entre de novo." };
    // Confere a senha atual antes de trocar.
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signError) return { ok: false, message: "A senha atual não confere." };
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) return { ok: false, message: "Não foi possível alterar a senha. Tente de novo." };
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteAccountAction(): Promise<ActionResult> {
  try {
    await deleteMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return { ok: false, message: "Por segurança, entre de novo antes de excluir a conta." };
    }
    return failure(error);
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

export async function linkProviderAction(
  provider: "google" | "spotify",
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/configuracoes")}` },
  });
  if (error || !data.url) return { ok: false, message: "Não foi possível vincular. Tente de novo." };
  return { ok: true, url: data.url };
}

export async function unlinkProviderAction(provider: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const identities = user?.identities ?? [];
  if (identities.length <= 1) {
    return { ok: false, message: "Você precisa manter pelo menos um método de login." };
  }
  const identity = identities.find((i) => i.provider === provider);
  if (!identity) return { ok: false, message: "Método de login não encontrado." };
  const { error } = await supabase.auth.unlinkIdentity(identity);
  if (error) return { ok: false, message: "Não foi possível desvincular. Tente de novo." };
  return { ok: true, data: null };
}

export async function getMeAction(): Promise<Me | null> {
  try {
    return await getMe();
  } catch {
    return null;
  }
}
