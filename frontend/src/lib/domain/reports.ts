import {
  type Day,
  addDays,
  addMonths,
  diffDays,
  eachDay,
  endOfMonth,
  startOfMonth,
  weekday,
} from "@/lib/dates";
import { formatDate, formatDayMonth, formatMonthYear } from "@/lib/format";
import type { Book, ReadingSession } from "@/lib/types";
import {
  type RangeTotals,
  dayOf,
  longestStreak,
  pace,
  pagesOf,
  sessionsOfBook,
  sumRange,
  totalsByDay,
} from "./sessions";

export const PERIOD_KINDS = {
  mes: "Mês",
  trimestre: "Trimestre",
  ano: "Ano",
  personalizado: "Personalizado",
} as const;
export type PeriodKind = keyof typeof PERIOD_KINDS;

export interface Period {
  kind: PeriodKind;
  from: Day;
  to: Day;
  /** Fim efetivo: o período não conta dias futuros. */
  effectiveTo: Day;
  label: string;
  range: string;
  previous: { from: Day; to: Day; label: string };
  /** Referências para navegar entre períodos; null no personalizado. */
  prevRef: Day | null;
  nextRef: Day | null;
}

const MONTHS_PER_KIND = { mes: 1, trimestre: 3, ano: 12 } as const;

export function resolvePeriod(
  kind: PeriodKind,
  ref: Day,
  custom: { from: Day; to: Day },
  today: Day,
): Period {
  let from: Day;
  let to: Day;
  let label: string;
  let prevFrom: Day;
  let prevLabel: string;
  let step = 0;

  if (kind === "personalizado") {
    from = custom.from;
    to = custom.to;
    label = "Período personalizado";
    prevFrom = addDays(from, -(diffDays(from, to) + 1));
    prevLabel = "período anterior";
  } else {
    step = MONTHS_PER_KIND[kind];
    const monthStart = startOfMonth(ref);
    const [, month] = monthStart.split("-").map(Number);
    from = kind === "mes" ? monthStart : kind === "trimestre" ? addMonths(monthStart, -((month - 1) % 3)) : `${ref.slice(0, 4)}-01-01`;
    to = endOfMonth(addMonths(from, step - 1));
    prevFrom = addMonths(from, -step);
    label =
      kind === "mes"
        ? formatMonthYear(from)
        : kind === "trimestre"
          ? `${Math.floor((Number(from.slice(5, 7)) - 1) / 3) + 1}º trimestre de ${from.slice(0, 4)}`
          : from.slice(0, 4);
    prevLabel =
      kind === "mes"
        ? formatMonthYear(prevFrom).split(" de ")[0].toLowerCase()
        : kind === "trimestre"
          ? "trimestre anterior"
          : prevFrom.slice(0, 4);
  }

  const effectiveTo = to < today ? to : from > today ? from : today;
  const span = diffDays(from, effectiveTo) + 1;
  const prevPeriodEnd = kind === "personalizado" ? addDays(from, -1) : endOfMonth(addMonths(prevFrom, step - 1));
  const prevTo = addDays(prevFrom, span - 1);

  return {
    kind,
    from,
    to,
    effectiveTo,
    label,
    range: `${formatDayMonth(from)} – ${formatDate(to)}`,
    previous: { from: prevFrom, to: prevTo < prevPeriodEnd ? prevTo : prevPeriodEnd, label: prevLabel },
    prevRef: step > 0 ? addMonths(from, -step) : null,
    nextRef: step > 0 ? addMonths(from, step) : null,
  };
}

export interface Summary extends RangeTotals {
  started: number;
  finished: number;
  rhythm: number | null;
}

export function summarize(books: Book[], sessions: ReadingSession[], from: Day, to: Day): Summary {
  const inPeriod = (date: string | null) => {
    const day = date?.slice(0, 10);
    return day !== undefined && day >= from && day <= to;
  };
  const totals = sumRange(totalsByDay(sessions), from, to);
  return {
    ...totals,
    started: books.filter((b) => inPeriod(b.startedAt)).length,
    finished: books.filter((b) => inPeriod(b.finishedAt)).length,
    rhythm: pace(totals.pages, totals.minutes),
  };
}

export interface HeatCell {
  day: Day;
  pages: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface FinishedRow {
  book: Book;
  start: Day | null;
  end: Day;
  days: number | null;
  sessions: number;
  rhythm: number | null;
}

export interface ReportData {
  period: Period;
  current: Summary;
  previous: Summary;
  heatmap: {
    /** Semanas começando no domingo; null = fora do período. */
    weeks: (HeatCell | null)[][];
    elapsedDays: number;
    longestStreak: number;
  };
  finished: FinishedRow[];
  isEmpty: boolean;
}

function levelOf(pages: number, max: number): HeatCell["level"] {
  if (pages <= 0 || max <= 0) return 0;
  const ratio = pages / max;
  return ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 3 : 4;
}

export function buildReport(
  books: Book[],
  sessions: ReadingSession[],
  period: Period,
): ReportData {
  const byDay = totalsByDay(sessions);
  const { from, to, effectiveTo } = period;
  const current = summarize(books, sessions, from, effectiveTo);
  const previous = summarize(books, sessions, period.previous.from, period.previous.to);

  const days = eachDay(from, to);
  const max = Math.max(0, ...days.map((d) => byDay.get(d)?.pages ?? 0));
  const cells = days.map<HeatCell>((day) => {
    const pages = byDay.get(day)?.pages ?? 0;
    return { day, pages, level: levelOf(pages, max) };
  });
  const padded: (HeatCell | null)[] = [...Array<null>(weekday(from)).fill(null), ...cells];
  while (padded.length % 7 !== 0) padded.push(null);
  const weeks = Array.from({ length: padded.length / 7 }, (_, i) => padded.slice(i * 7, i * 7 + 7));

  const finished = books
    .filter((b) => b.finishedAt && b.finishedAt.slice(0, 10) >= from && b.finishedAt.slice(0, 10) <= to)
    .map<FinishedRow>((book) => {
      const own = sessionsOfBook(sessions, book.id);
      const firstSession = own.map(dayOf).filter((d): d is Day => d !== null).sort()[0] ?? null;
      const start = book.startedAt?.slice(0, 10) ?? firstSession;
      const end = book.finishedAt!.slice(0, 10);
      const pages = own.reduce((sum, s) => sum + pagesOf(s), 0);
      const minutes = own.reduce((sum, s) => sum + (s.durationMin ?? 0), 0);
      return {
        book,
        start,
        end,
        days: start ? diffDays(start, end) : null,
        sessions: own.length,
        rhythm: pace(pages, minutes),
      };
    })
    .sort((a, b) => b.end.localeCompare(a.end));

  return {
    period,
    current,
    previous,
    heatmap: {
      weeks,
      elapsedDays: diffDays(from, effectiveTo) + 1,
      longestStreak: longestStreak(byDay, from, effectiveTo),
    },
    finished,
    isEmpty: current.sessions === 0 && finished.length === 0,
  };
}
