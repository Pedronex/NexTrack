import { type Day, addDays, startOfMonth } from "@/lib/dates";
import { PERIOD_KINDS, type PeriodKind } from "@/lib/domain/reports";

export interface ReportParams {
  kind: PeriodKind;
  /** Qualquer dia dentro do período navegado. */
  ref: Day;
  from: Day;
  to: Day;
  compare: boolean;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const isDay = (value: string | undefined): value is Day => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "");

export function parseReportParams(raw: RawParams, today: Day): ReportParams {
  const kind = first(raw.tipo);
  const ref = first(raw.ref);
  const from = first(raw.de);
  const to = first(raw.ate);
  const parsedFrom = isDay(from) ? from : startOfMonth(today);
  const parsedTo = isDay(to) && to >= parsedFrom ? to : addDays(parsedFrom, 29);
  return {
    kind: kind && kind in PERIOD_KINDS ? (kind as PeriodKind) : "mes",
    ref: isDay(ref) ? ref : today,
    from: parsedFrom,
    to: parsedTo,
    compare: first(raw.comparar) !== "0",
  };
}

export function reportHref(current: ReportParams, today: Day, patch: Partial<ReportParams> = {}) {
  const next = { ...current, ...patch };
  const query = new URLSearchParams();
  if (next.kind !== "mes") query.set("tipo", next.kind);
  if (next.kind === "personalizado") {
    query.set("de", next.from);
    query.set("ate", next.to);
  } else if (next.ref !== today) {
    query.set("ref", next.ref);
  }
  if (!next.compare) query.set("comparar", "0");
  const search = query.toString();
  return search ? `/relatorios?${search}` : "/relatorios";
}
