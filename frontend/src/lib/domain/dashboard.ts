import {
  type Day,
  addDays,
  addMonths,
  dayOfMonth,
  eachDay,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from "@/lib/dates";
import { formatDate, formatHours, formatNumber, monthName, plural } from "@/lib/format";
import type { Book, ReadingSession } from "@/lib/types";
import { countByFormat, countByStatus, lastReadByBook } from "./books";
import {
  currentStreak,
  dayOf,
  pagesOf,
  sumRange,
  totalsByDay,
} from "./sessions";

const CHART_DAYS = 30;
const CHART_WEEKS = 8;
const STREAK_DAYS = 21;

const niceCeil = (value: number, step: number) => Math.max(step, Math.ceil(value / step) * step);

export interface DashboardData {
  eyebrow: string;
  year: string;
  month: string;
  lede: string;
  figures: {
    finishedThisYear: { value: number; note: string };
    pages: { value: number; note: string };
    time: { value: string; note: string };
    average: { value: number; note: string };
    streak: { value: number; last21: { day: Day; read: boolean }[] };
  };
  reading: { book: Book; lastDay: Day | null }[];
  lastNote: { text: string; day: Day } | null;
  recent: RecentSession[];
  pagesPerDay: {
    days: { day: Day; pages: number; isToday: boolean }[];
    ticks: number[];
    top: number;
    average: number;
    todayPages: number;
    subtitle: string;
  };
  minutesPerWeek: {
    weeks: { start: Day; minutes: number; current: boolean }[];
    top: number;
    subtitle: string;
  };
  library: {
    total: number;
    subtitle: string;
    counts: Record<string, number>;
  };
}

export interface RecentSession {
  id: string;
  day: Day;
  title: string;
  bookTitle: string | null;
  range: string | null;
  pages: number;
  minutes: number;
  hasMusic: boolean;
}

function versus(diff: number, than: string, equal: string) {
  if (diff === 0) return equal;
  return `${Math.abs(diff)} ${diff > 0 ? "a mais" : "a menos"} ${than}`;
}

export function buildDashboard(books: Book[], sessions: ReadingSession[], today: Day): DashboardData {
  const byDay = totalsByDay(sessions);
  const bookById = new Map(books.map((b) => [b.id, b]));

  const monthStart = startOfMonth(today);
  const elapsed = dayOfMonth(today);
  const prevStart = addMonths(monthStart, -1);
  const prevEnd = addDays(prevStart, Math.min(elapsed, dayOfMonth(endOfMonth(prevStart))) - 1);
  const month = sumRange(byDay, monthStart, today);
  const prevMonth = sumRange(byDay, prevStart, prevEnd);
  const prevName = monthName(prevStart);

  const year = today.slice(0, 4);
  const prevYear = String(Number(year) - 1);
  const prevYearSameDay = `${prevYear}${today.slice(4)}`;
  const finishedIn = (from: Day, to: Day) =>
    books.filter((b) => b.finishedAt && b.finishedAt.slice(0, 10) >= from && b.finishedAt.slice(0, 10) <= to)
      .length;
  const finishedThisYear = finishedIn(`${year}-01-01`, today);
  const finishedPrevYear = finishedIn(`${prevYear}-01-01`, prevYearSameDay);

  const lastRead = lastReadByBook(sessions);
  const reading = books
    .filter((b) => b.status === "Lendo")
    .map((book) => ({ book, lastDay: lastRead.get(book.id)?.slice(0, 10) ?? null }))
    .sort((a, b) => (b.lastDay ?? "").localeCompare(a.lastDay ?? ""));
  const featured = reading[0]?.book;

  const featuredNote = featured
    ? sessions.find((s) => s.bookId === featured.id && s.notes && dayOf(s))
    : undefined;

  const pctMore = prevMonth.pages > 0 ? Math.round(((month.pages - prevMonth.pages) / prevMonth.pages) * 100) : null;
  const ledeParts = [
    month.pages > 0
      ? `${formatNumber(month.pages)} ${plural(month.pages, "página", "páginas")} em ${month.daysRead} dos ${elapsed} dias`
      : "Nenhuma leitura registrada este mês",
    pctMore !== null && month.pages > 0
      ? ` — ${Math.abs(pctMore)}% ${pctMore >= 0 ? "a mais" : "a menos"} que em ${prevName}`
      : "",
    ".",
    featured && featured.totalPages
      ? ` Faltam ${formatNumber(Math.max(0, featured.totalPages - (featured.currentPage ?? 0)))} páginas para terminar ${featured.title}.`
      : "",
  ];

  const avg = month.sessions > 0 ? Math.round(month.pages / month.sessions) : 0;
  const prevAvg = prevMonth.sessions > 0 ? Math.round(prevMonth.pages / prevMonth.sessions) : 0;
  const streak = currentStreak(byDay, today);

  const chartDays = eachDay(addDays(today, -(CHART_DAYS - 1)), today).map((day) => ({
    day,
    pages: byDay.get(day)?.pages ?? 0,
    isToday: day === today,
  }));
  const chartTotal = chartDays.reduce((sum, d) => sum + d.pages, 0);
  const chartTop = niceCeil(Math.max(...chartDays.map((d) => d.pages)), 20);
  const idleDays = chartDays.filter((d) => d.pages === 0).length;

  const thisWeek = startOfWeek(today);
  const weeks = Array.from({ length: CHART_WEEKS }, (_, i) => {
    const start = addDays(thisWeek, -7 * (CHART_WEEKS - 1 - i));
    return {
      start,
      minutes: sumRange(byDay, start, addDays(start, 6)).minutes,
      current: start === thisWeek,
    };
  });
  const weeksAverage = Math.round(weeks.reduce((sum, w) => sum + w.minutes, 0) / CHART_WEEKS);

  const formats = countByFormat(books);
  const formatLabel = (key: "Físico" | "E-Book" | "Audiobook", one: string, many: string) => {
    const n = formats.get(key) ?? 0;
    return n > 0 ? `${n} ${plural(n, one, many)}` : null;
  };
  const formatParts = [
    formatLabel("Físico", "físico", "físicos"),
    formatLabel("E-Book", "e-book", "e-books"),
    formatLabel("Audiobook", "audiolivro", "audiolivros"),
  ].filter(Boolean);

  return {
    eyebrow: formatDate(today),
    year,
    month: monthName(today),
    lede: ledeParts.join(""),
    figures: {
      finishedThisYear: {
        value: finishedThisYear,
        note: versus(
          finishedThisYear - finishedPrevYear,
          `que em ${prevYear}`,
          `igual a ${prevYear}`,
        ),
      },
      pages: {
        value: month.pages,
        note:
          prevMonth.pages > 0
            ? `${pctMore! >= 0 ? "+" : "−"}${Math.abs(pctMore!)}% sobre ${prevName}`
            : `em ${monthName(today)}`,
      },
      time: {
        value: formatHours(month.minutes),
        note: `${month.minutes >= prevMonth.minutes ? "+" : "−"}${formatHours(Math.abs(month.minutes - prevMonth.minutes))} sobre ${prevName}`,
      },
      average: {
        value: avg,
        note: `páginas · ${versus(avg - prevAvg, `que ${prevName}`, `igual a ${prevName}`)}`,
      },
      streak: {
        value: streak,
        last21: eachDay(addDays(today, -(STREAK_DAYS - 1)), today).map((day) => ({
          day,
          read: byDay.has(day),
        })),
      },
    },
    reading,
    lastNote:
      featuredNote && featuredNote.notes
        ? { text: featuredNote.notes, day: dayOf(featuredNote)! }
        : null,
    recent: sessions
      .filter((s) => dayOf(s))
      .toSorted((a, b) => dayOf(b)!.localeCompare(dayOf(a)!))
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        day: dayOf(s)!,
        title: s.title,
        bookTitle: (s.bookId && bookById.get(s.bookId)?.title) || null,
        range: s.startPage != null && s.endPage != null ? `pp. ${s.startPage}–${s.endPage}` : null,
        pages: pagesOf(s),
        minutes: s.durationMin ?? 0,
        hasMusic: Boolean(s.spotifyUrl),
      })),
    pagesPerDay: {
      days: chartDays,
      ticks: [chartTop, chartTop / 2, 0],
      top: chartTop,
      average: Math.round(chartTotal / CHART_DAYS),
      todayPages: chartDays.at(-1)?.pages ?? 0,
      subtitle: `Últimos ${CHART_DAYS} dias, de ${formatDate(chartDays[0].day)} a ${formatDate(today)}. ${
        idleDays === 0 ? "Nenhum dia sem leitura." : `${idleDays} ${plural(idleDays, "dia", "dias")} sem leitura.`
      }`,
    },
    minutesPerWeek: {
      weeks,
      top: Math.max(1, ...weeks.map((w) => w.minutes)),
      subtitle: `Média de ${weeksAverage} nas últimas oito.`,
    },
    library: {
      total: books.length,
      subtitle:
        books.length === 0
          ? "Nenhum livro cadastrado."
          : `${books.length} ${plural(books.length, "livro", "livros")}${formatParts.length ? `: ${formatParts.join(", ")}` : ""}.`,
      counts: countByStatus(books),
    },
  };
}
