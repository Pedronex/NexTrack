import { type Day, addDays, diffDays, startOfWeek, toDay } from "@/lib/dates";
import { formatDayMonth } from "@/lib/format";
import type { Book, ReadingSession } from "@/lib/types";

export interface Totals {
  pages: number;
  minutes: number;
  sessions: number;
}

export interface RangeTotals extends Totals {
  daysRead: number;
}

export const pagesOf = (session: ReadingSession) =>
  session.pagesRead ??
  (session.startPage != null && session.endPage != null
    ? Math.max(0, session.endPage - session.startPage)
    : 0);

/** Páginas por hora; null quando não há duração registrada. */
export const pace = (pages: number, minutes: number) =>
  minutes > 0 ? Math.round((pages / minutes) * 60) : null;

export const dayOf = (session: ReadingSession): Day | null =>
  session.date ? toDay(session.date) : null;

export function totalsByDay(sessions: ReadingSession[]) {
  const byDay = new Map<Day, Totals>();
  for (const session of sessions) {
    const day = dayOf(session);
    if (!day) continue;
    const totals = byDay.get(day) ?? { pages: 0, minutes: 0, sessions: 0 };
    totals.pages += pagesOf(session);
    totals.minutes += session.durationMin ?? 0;
    totals.sessions += 1;
    byDay.set(day, totals);
  }
  return byDay;
}

export function sumRange(byDay: Map<Day, Totals>, from: Day, to: Day): RangeTotals {
  const total: RangeTotals = { pages: 0, minutes: 0, sessions: 0, daysRead: 0 };
  for (const [day, totals] of byDay) {
    if (day < from || day > to) continue;
    total.pages += totals.pages;
    total.minutes += totals.minutes;
    total.sessions += totals.sessions;
    total.daysRead += 1;
  }
  return total;
}

/** Dias seguidos com leitura, contando de hoje (ou de ontem, se hoje ainda não teve). */
export function currentStreak(byDay: Map<Day, Totals>, today: Day) {
  let day = byDay.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (byDay.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function longestStreak(byDay: Map<Day, Totals>, from: Day, to: Day) {
  let longest = 0;
  let run = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    run = byDay.has(day) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}

export const sessionsOfBook = (sessions: ReadingSession[], bookId: string) =>
  sessions.filter((session) => session.bookId === bookId);

export interface WeekGroup {
  key: Day;
  title: string;
  range: string;
  sessions: ReadingSession[];
  pages: number;
}

/** Agrupa por semana (segunda a domingo), da mais recente para a mais antiga. */
export function groupByWeek(sessions: ReadingSession[], today: Day): WeekGroup[] {
  const groups = new Map<Day, ReadingSession[]>();
  for (const session of sessions) {
    const day = dayOf(session);
    if (!day) continue;
    const week = startOfWeek(day);
    groups.set(week, [...(groups.get(week) ?? []), session]);
  }

  const thisWeek = startOfWeek(today);
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([week, items]) => {
      const end = week === thisWeek ? today : addDays(week, 6);
      // 19–22/10 dentro do mesmo mês; 28/09–04/10 quando a semana cruza meses.
      const range =
        week.slice(0, 7) === end.slice(0, 7)
          ? `${week.slice(8, 10)}–${formatDayMonth(end)}`
          : `${formatDayMonth(week)}–${formatDayMonth(end)}`;
      const title =
        week === thisWeek
          ? "Esta semana"
          : week === addDays(thisWeek, -7)
            ? "Semana passada"
            : `Semana de ${range}`;
      const sorted = items.toSorted((a, b) => (dayOf(b) ?? "").localeCompare(dayOf(a) ?? ""));
      return {
        key: week,
        title,
        range,
        sessions: sorted,
        pages: sorted.reduce((sum, s) => sum + pagesOf(s), 0),
      };
    });
}

export interface BookStats {
  sessions: ReadingSession[];
  pages: number;
  minutes: number;
  pace: number | null;
  avgPerSession: number;
  sessionsLeft: number | null;
  forecast: Day | null;
}

export function bookStats(book: Book, bookSessions: ReadingSession[], today: Day): BookStats {
  const sessions = bookSessions.toSorted((a, b) => (dayOf(b) ?? "").localeCompare(dayOf(a) ?? ""));
  const pages = sessions.reduce((sum, s) => sum + pagesOf(s), 0);
  const minutes = sessions.reduce((sum, s) => sum + (s.durationMin ?? 0), 0);
  const avgPerSession = sessions.length > 0 ? Math.round(pages / sessions.length) : 0;
  const left = Math.max(0, (book.totalPages ?? 0) - (book.currentPage ?? 0));

  const days = sessions.map(dayOf).filter((d): d is Day => d !== null).sort();
  const spanDays = days.length > 0 ? Math.max(1, diffDays(days[0], today) + 1) : 0;
  const perDay = spanDays > 0 ? pages / spanDays : 0;

  return {
    sessions,
    pages,
    minutes,
    pace: pace(pages, minutes),
    avgPerSession,
    sessionsLeft: avgPerSession > 0 && left > 0 ? Math.ceil(left / avgPerSession) : null,
    forecast: perDay > 0 && left > 0 ? addDays(today, Math.ceil(left / perDay)) : null,
  };
}
