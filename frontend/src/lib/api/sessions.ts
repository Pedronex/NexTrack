import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Book, Page, ReadingSession, SessionInput } from "@/lib/types";
import { api } from "./client";

export const SESSIONS_TAG = "sessions";
const PAGE_SIZE = 100;

async function fetchAllSessions(): Promise<ReadingSession[]> {
  const sessions: ReadingSession[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) query.set("cursor", cursor);
    const page: Page<ReadingSession> = await api(`/sessions?${query}`);
    sessions.push(...page.data);
    cursor = page.hasMore ? page.nextCursor : null;
  } while (cursor);
  return sessions;
}

export async function getAllSessions(): Promise<ReadingSession[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SESSIONS_TAG);
  return fetchAllSessions();
}

export const createSession = (input: SessionInput) =>
  api<ReadingSession & { book?: Book }>("/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const deleteSession = (id: string) =>
  api<{ ok: true }>(`/sessions/${id}`, { method: "DELETE" });
