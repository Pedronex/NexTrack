export const SESSIONS_PAGE_SIZE = 30;

export interface SessionsParams {
  q?: string;
  bookId?: string;
  /** "YYYY-MM" ou "todos" */
  month: string;
  limit: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseSessionsParams(raw: RawParams, currentMonth: string): SessionsParams {
  const limit = Number(first(raw.limite));
  const month = first(raw.periodo);
  return {
    q: first(raw.q)?.trim() || undefined,
    bookId: first(raw.livro) || undefined,
    month: month === "todos" || /^\d{4}-\d{2}$/.test(month ?? "") ? month! : currentMonth,
    limit: Number.isInteger(limit) && limit > 0 ? limit : SESSIONS_PAGE_SIZE,
  };
}

export function sessionsHref(current: SessionsParams, currentMonth: string, patch: Partial<SessionsParams> = {}) {
  const next = { ...current, limit: SESSIONS_PAGE_SIZE, ...patch };
  const query = new URLSearchParams();
  if (next.q) query.set("q", next.q);
  if (next.bookId) query.set("livro", next.bookId);
  if (next.month !== currentMonth) query.set("periodo", next.month);
  if (next.limit !== SESSIONS_PAGE_SIZE) query.set("limite", String(next.limit));
  const search = query.toString();
  return search ? `/sessoes?${search}` : "/sessoes";
}
