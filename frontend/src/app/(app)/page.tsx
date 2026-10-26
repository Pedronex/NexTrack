import type { Metadata } from "next";
import { Suspense } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { getAllBooks } from "@/lib/api/books";
import { getSpotifyStatus } from "@/lib/api/integrations";
import { getMe } from "@/lib/api/me";
import { getAllSessions } from "@/lib/api/sessions";
import { buildDashboard } from "@/lib/domain/dashboard";
import { firstSteps, isFirstAccess } from "@/lib/domain/first-steps";
import { formatDate, monthName, weekdayLong } from "@/lib/format";
import { getToday } from "@/lib/today";
import { Figures } from "@/features/dashboard/figures";
import { FirstSteps } from "@/features/dashboard/first-steps";
import { LibrarySummary } from "@/features/dashboard/library-summary";
import { ReadingNow } from "@/features/dashboard/reading-now";
import { RecentSessions } from "@/features/dashboard/recent-sessions";
import { MinutesPerWeek, PagesPerDay } from "@/features/dashboard/rhythm";
import { DashboardSkeleton } from "@/features/dashboard/skeleton";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const today = await getToday();
  const [books, sessions, me, spotify] = await Promise.all([
    getAllBooks(),
    getAllSessions(),
    getMe().catch(() => null),
    getSpotifyStatus().catch(() => null),
  ]);
  const topBar = (
    <TopBar eyebrow={`${weekdayLong(today)} · ${formatDate(today)}`} title={`Seu ${monthName(today)}, até aqui`} />
  );

  if (isFirstAccess(books.length, sessions.length)) {
    return (
      <>
        {topBar}
        <FirstSteps
          name={me?.displayName ?? ""}
          steps={firstSteps({
            books: books.length,
            sessions: sessions.length,
            spotifyConnected: spotify?.connected ?? false,
          })}
        />
      </>
    );
  }

  const data = buildDashboard(books, sessions, today);
  return (
    <>
      {topBar}
      <div className="flex flex-col gap-11 px-10 pt-1 pb-16">
        <p className="max-w-[760px] font-display text-[23px] leading-snug text-text-secondary">{data.lede}</p>
        <Figures data={data} />
        <div className="flex flex-col gap-14 xl:flex-row">
          <ReadingNow data={data} />
          <RecentSessions sessions={data.recent} />
        </div>
        <div className="flex flex-col gap-14 border-t border-border-strong pt-7 xl:flex-row">
          <PagesPerDay chart={data.pagesPerDay} />
          <MinutesPerWeek chart={data.minutesPerWeek} />
        </div>
        <div className="border-t border-border-strong pt-7">
          <LibrarySummary library={data.library} />
        </div>
      </div>
    </>
  );
}
