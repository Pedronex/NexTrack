import { BOOK_ORDERS, FORMATS, type BookOrder, STATUSES } from "@/lib/domain/books";
import type { BookFormat, Status } from "@/lib/types";

export const PAGE_SIZE = 10;

export type LibraryView = "grade" | "tabela";

export interface LibraryParams {
  view: LibraryView;
  status?: Status;
  format?: BookFormat;
  order: BookOrder;
  q?: string;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const oneOf = <T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined =>
  allowed.find((item) => item === value);

export function parseLibraryParams(raw: RawParams): LibraryParams {
  const page = Number(first(raw.pagina));
  return {
    view: first(raw.view) === "tabela" ? "tabela" : "grade",
    status: oneOf(first(raw.status), STATUSES),
    format: oneOf(first(raw.formato), FORMATS),
    order: oneOf(first(raw.ordem), Object.keys(BOOK_ORDERS) as BookOrder[]) ?? "recente",
    q: first(raw.q)?.trim() || undefined,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** Monta a URL da biblioteca com `patch` aplicado; trocar filtro volta para a página 1. */
export function libraryHref(current: LibraryParams, patch: Partial<LibraryParams> = {}) {
  const next = { ...current, page: 1, ...patch };
  const query = new URLSearchParams();
  if (next.view !== "grade") query.set("view", next.view);
  if (next.status) query.set("status", next.status);
  if (next.format) query.set("formato", next.format);
  if (next.order !== "recente") query.set("ordem", next.order);
  if (next.q) query.set("q", next.q);
  if (next.page > 1) query.set("pagina", String(next.page));
  const search = query.toString();
  return search ? `/biblioteca?${search}` : "/biblioteca";
}
