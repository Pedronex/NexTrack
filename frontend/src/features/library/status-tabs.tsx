import Link from "next/link";
import { StatusDot } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";
import { STATUSES, STATUS_TONE } from "@/lib/domain/books";
import type { Status } from "@/lib/types";
import { type LibraryParams, libraryHref } from "./params";

interface StatusTabsProps {
  params: LibraryParams;
  total: number;
  counts: Record<Status, number>;
}

export function StatusTabs({ params, total, counts }: StatusTabsProps) {
  const tabs: { status?: Status; label: string; count: number }[] = [
    { label: "Todos", count: total },
    ...STATUSES.map((status) => ({ status, label: status, count: counts[status] })),
  ];

  return (
    <nav aria-label="Filtrar por status" className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map(({ status, label, count }) => {
        const active = params.status === status;
        return (
          <Link
            key={label}
            href={libraryHref(params, { status })}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap",
              active
                ? "border-text-primary text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {status && <StatusDot tone={STATUS_TONE[status]} />}
            {label}
            <span className="text-xs font-normal text-text-tertiary">{count}</span>
          </Link>
        );
      })}
    </nav>
  );
}
