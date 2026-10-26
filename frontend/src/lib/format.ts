import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Day } from "./dates";

const numberFormat = new Intl.NumberFormat("pt-BR");

const fmt = (day: Day, pattern: string) => format(parseISO(day.slice(0, 10)), pattern, { locale: ptBR });

const capitalize = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`;

export const formatNumber = (n: number) => numberFormat.format(Math.round(n));

/** 2026-10-22 → 22/10/2026 */
export const formatDate = (day: Day) => fmt(day, "dd/MM/yyyy");

/** 2026-10-22 → 22/10 */
export const formatDayMonth = (day: Day) => fmt(day, "dd/MM");

/** 2026-10-22 → 22/10/26 */
export const formatDateShort = (day: Day) => fmt(day, "dd/MM/yy");

/** 2026-10-22 → qui */
export const weekdayShort = (day: Day) => fmt(day, "EEE").replace(".", "");

/** 2026-10-22 → Quinta-feira */
export const weekdayLong = (day: Day) => capitalize(fmt(day, "EEEE"));

/** 2026-10-22 → outubro */
export const monthName = (day: Day) => fmt(day, "LLLL");

/** 2026-10-22 → Outubro de 2026 */
export const formatMonthYear = (day: Day) => capitalize(fmt(day, "LLLL 'de' yyyy"));

/** 1300 min → "21h40"; com `spaced`, "21h 40". Abaixo de 1h, "45 min". */
export function formatHours(minutes: number, spaced = false) {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return `${h}h${spaced ? " " : ""}${String(m).padStart(2, "0")}`;
}

export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Delta percentual com seta: ↑ 18% / ↓ 5% / 0%. */
export function formatDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "0%" : "novo";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? "↑" : pct < 0 ? "↓" : ""} ${Math.abs(pct)}%`.trim();
}
