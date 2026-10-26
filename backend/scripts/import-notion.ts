/**
 * Importação única dos dados do Notion para a conta do dono (Task 17).
 * Uso: IMPORT_USER_EMAIL=... bun run scripts/import-notion.ts
 * Descartável: remover após a validação (Task 18).
 */
import { Client, isFullPage } from "@notionhq/client";
import { createClient } from "@supabase/supabase-js";
import { toBookRow, toSessionRow } from "../src/db/mappers";
import type { BookRow, SessionRow } from "../src/db/rows";
import type { Book, ReadingSession } from "../src/types";
import { toBook, toSession } from "../src/utils/mappers";

export interface ImportPlan {
  books: (BookRow & { id: string; user_id: string })[];
  sessions: (SessionRow & { id: string; user_id: string })[];
  skipped: { id: string; reason: string }[];
}

/** Puro: gera UUIDs novos e traduz bookId do Notion para o UUID novo. */
export function planImport(
  books: Book[],
  sessions: ReadingSession[],
  userId: string,
): ImportPlan {
  const idMap = new Map<string, string>();
  const bookRows = books.map((book) => {
    const id = crypto.randomUUID();
    idMap.set(book.id, id);
    const { title, ...rest } = toBookRow(book);
    return {
      id,
      user_id: userId,
      title: book.title,
      author: rest.author ?? null,
      status: rest.status ?? null,
      format: rest.format ?? null,
      current_page: rest.current_page ?? 0,
      total_pages: rest.total_pages ?? null,
      started_at: rest.started_at ?? null,
      finished_at: rest.finished_at ?? null,
      rating: rest.rating ?? null,
      isbn: rest.isbn ?? null,
    };
  });

  const sessionRows: ImportPlan["sessions"] = [];
  const skipped: ImportPlan["skipped"] = [];
  for (const session of sessions) {
    if (session.bookId !== null && !idMap.has(session.bookId)) {
      skipped.push({ id: session.id, reason: "book_not_found" });
      continue;
    }
    const row = toSessionRow(session);
    sessionRows.push({
      id: crypto.randomUUID(),
      user_id: userId,
      book_id: session.bookId === null ? null : (idMap.get(session.bookId) ?? null),
      title: session.title,
      date: row.date ?? new Date().toISOString().slice(0, 10),
      start_page: row.start_page ?? null,
      end_page: row.end_page ?? null,
      pages_read: row.pages_read ?? null,
      duration_min: row.duration_min ?? null,
      spotify_url: row.spotify_url ?? null,
      notes: row.notes ?? null,
    });
  }

  return { books: bookRows, sessions: sessionRows, skipped };
}

// ---- execução ----

async function main() {
  const { NOTION_TOKEN, NOTION_BOOKS_DATA_SOURCE_ID, NOTION_SESSIONS_DATA_SOURCE_ID } = process.env as Record<
    string,
    string | undefined
  >;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IMPORT_USER_EMAIL } = process.env as Record<
    string,
    string | undefined
  >;
  if (!NOTION_TOKEN || !NOTION_BOOKS_DATA_SOURCE_ID || !NOTION_SESSIONS_DATA_SOURCE_ID) {
    throw new Error("NOTION_TOKEN / NOTION_*_DATA_SOURCE_ID ausentes");
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !IMPORT_USER_EMAIL) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / IMPORT_USER_EMAIL ausentes");
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  let userId: string | null = null;
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === IMPORT_USER_EMAIL);
    if (found) {
      userId = found.id;
      break;
    }
    if (data.users.length < 100) break;
    page += 1;
  }
  if (!userId) throw new Error(`Usuário ${IMPORT_USER_EMAIL} não encontrado (cadastre-se antes)`);

  const notion = new Client({ auth: NOTION_TOKEN });
  async function queryAll(dataSourceId: string, sorts: never[]) {
    const results: unknown[] = [];
    let cursor: string | undefined;
    for (;;) {
      const res = await notion.dataSources.query({
        data_source_id: dataSourceId,
        sorts,
        start_cursor: cursor,
        page_size: 100,
      });
      results.push(...res.results);
      if (!res.has_more) break;
      cursor = res.next_cursor ?? undefined;
    }
    return results;
  }

  const bookPages = await queryAll(NOTION_BOOKS_DATA_SOURCE_ID, [
    { property: "Livro", direction: "ascending" },
  ] as never[]);
  const sessionPages = await queryAll(NOTION_SESSIONS_DATA_SOURCE_ID, [
    { property: "Data", direction: "descending" },
  ] as never[]);

  const books = bookPages.filter(isFullPage).map(toBook);
  const sessions = sessionPages.filter(isFullPage).map(toSession);
  const plan = planImport(books, sessions, userId);

  if (plan.books.length > 0) {
    const { error } = await admin.from("books").insert(plan.books);
    if (error) throw error;
  }
  if (plan.sessions.length > 0) {
    const { error } = await admin.from("reading_sessions").insert(plan.sessions);
    if (error) throw error;
  }

  console.log(
    `Importados ${plan.books.length} livros e ${plan.sessions.length} sessões para ${IMPORT_USER_EMAIL}. Ignoradas: ${plan.skipped.length}.`,
  );
  for (const s of plan.skipped) console.log(`  ignorada ${s.id}: ${s.reason}`);
}

if (import.meta.main) {
  await main();
}
