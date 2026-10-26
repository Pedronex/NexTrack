import { connection } from "next/server";
import { type Day, localToday } from "./dates";

/** "Hoje" é dado de requisição: chame dentro de um limite <Suspense>. */
export async function getToday(): Promise<Day> {
  await connection();
  return localToday();
}
