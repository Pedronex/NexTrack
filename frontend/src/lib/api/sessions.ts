import "server-only";
import { cache } from "react";
import type { Book, Page, ReadingSession, SessionInput } from "@/lib/types";
import { requireUser } from "@/lib/session";
import { api } from "./client";

const PAGE_SIZE = 100;

async function fetchAllSessions(token: string): Promise<ReadingSession[]> {
  const sessions: ReadingSession[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) query.set("cursor", cursor);
    const page: Page<ReadingSession> = await api(`/sessions?${query}`, { token });
    sessions.push(...page.data);
    cursor = page.hasMore ? page.nextCursor : null;
  } while (cursor);
  return sessions;
}

// Cache por requisição (React cache): nenhum dado atravessa contas.
export const getAllSessions = cache(async (): Promise<ReadingSession[]> => {
  const { accessToken } = await requireUser();
  return fetchAllSessions(accessToken);
});

export async function createSession(
  input: SessionInput,
): Promise<ReadingSession & { book?: Book }> {
  const { accessToken } = await requireUser();
  return api<ReadingSession & { book?: Book }>("/sessions", {
    method: "POST",
    body: JSON.stringify(input),
    token: accessToken,
  });
}

export async function deleteSession(id: string): Promise<{ ok: true }> {
  const { accessToken } = await requireUser();
  return api<{ ok: true }>(`/sessions/${id}`, { method: "DELETE", token: accessToken });
}
