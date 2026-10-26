import { Music } from "lucide-react";
import Link from "next/link";
import type { DashboardData } from "@/lib/domain/dashboard";
import { formatDayMonth } from "@/lib/format";

export function RecentSessions({ sessions }: { sessions: DashboardData["recent"] }) {
  return (
    <section className="flex w-full flex-col gap-1.5 xl:w-[380px] xl:shrink-0">
      <div className="flex items-end justify-between pb-3.5">
        <h2 className="font-display text-[22px] font-medium">Últimas sessões</h2>
        <Link href="/sessoes" className="text-[13px] text-text-secondary hover:text-text-primary">
          Todas
        </Link>
      </div>
      {sessions.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhuma sessão registrada ainda.</p>
      ) : (
        <ul>
          {sessions.map((session) => (
            <li key={session.id} className="flex gap-4 border-t border-border py-3">
              <time dateTime={session.day} className="w-11 shrink-0 font-display text-[15px] text-text-tertiary">
                {formatDayMonth(session.day)}
              </time>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{session.title}</span>
                  {session.hasMusic && <Music size={12} className="shrink-0 text-spotify" aria-label="Com música" />}
                </p>
                <p className="truncate text-xs text-text-secondary">
                  {[session.bookTitle, session.range].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-sm font-medium">+{session.pages}</span>
                {session.minutes > 0 && <span className="text-xs text-text-tertiary">{session.minutes} min</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
