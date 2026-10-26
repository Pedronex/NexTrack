import {
  addDays as addDaysFns,
  addMonths as addMonthsFns,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth as endOfMonthFns,
  format,
  getDay,
  parseISO,
  startOfMonth as startOfMonthFns,
  startOfWeek as startOfWeekFns,
} from "date-fns";

/** Data de calendário "YYYY-MM-DD", sem fuso: evita deslocamentos de dia. */
export type Day = string;

const ISO_DAY = "yyyy-MM-dd";

const parse = (day: Day) => parseISO(day.slice(0, 10));
const stringify = (date: Date): Day => format(date, ISO_DAY);

export const toDay = (value: string): Day => value.slice(0, 10);

export const localToday = (now = new Date()): Day => stringify(now);

export const addDays = (day: Day, n: number): Day => stringify(addDaysFns(parse(day), n));

export const addMonths = (day: Day, n: number): Day => stringify(addMonthsFns(startOfMonthFns(parse(day)), n));

export const diffDays = (from: Day, to: Day) => differenceInCalendarDays(parse(to), parse(from));

/** 0 = domingo … 6 = sábado */
export const weekday = (day: Day) => getDay(parse(day));

/** Segunda-feira da semana de `day`. */
export const startOfWeek = (day: Day): Day => stringify(startOfWeekFns(parse(day), { weekStartsOn: 1 }));

export const startOfMonth = (day: Day): Day => stringify(startOfMonthFns(parse(day)));

export const endOfMonth = (day: Day): Day => stringify(endOfMonthFns(parse(day)));

export const dayOfMonth = (day: Day) => parse(day).getDate();

/** Dias de `from` a `to`, inclusive. */
export const eachDay = (from: Day, to: Day): Day[] =>
  eachDayOfInterval({ start: parse(from), end: parse(to) }).map(stringify);
