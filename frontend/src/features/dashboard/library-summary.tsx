import type { CSSProperties } from "react";
import { STATUSES, STATUS_TONE, TONE_CLASSES } from "@/lib/domain/books";
import type { DashboardData } from "@/lib/domain/dashboard";
import type { Status } from "@/lib/types";

export function LibrarySummary({ library }: { library: DashboardData["library"] }) {
  const present = STATUSES.filter((status) => library.counts[status] > 0);
  return (
    <section className="flex flex-col gap-6 lg:flex-row lg:gap-14">
      <div className="flex flex-col gap-1 lg:w-[300px] lg:shrink-0">
        <h2 className="font-display text-[22px] font-medium">A biblioteca</h2>
        <p className="text-[13px] text-text-secondary">{library.subtitle}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3.5 pt-1.5">
        <div className="flex h-2 gap-0.5" role="img" aria-label="Distribuição por status">
          {present.map((status: Status) => (
            <div
              key={status}
              style={{ "--n": library.counts[status] } as CSSProperties}
              className={`grow-(--n) basis-0 ${TONE_CLASSES[STATUS_TONE[status]].dot}`}
            />
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {STATUSES.map((status) => (
            <li key={status} className="flex items-center gap-1.5 text-[13px]">
              <span className={`size-2 ${TONE_CLASSES[STATUS_TONE[status]].dot}`} />
              <span className="text-text-secondary">{status}</span>
              <span className="font-semibold">{library.counts[status]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
