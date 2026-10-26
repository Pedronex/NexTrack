import { cn } from "@/lib/cn";
import { TONE_CLASSES, type Tone, toneOf } from "@/lib/domain/books";
import type { Status } from "@/lib/types";

interface StatusDotProps {
  tone: Tone;
  className?: string;
}

export function StatusDot({ tone, className }: StatusDotProps) {
  return <span className={cn("size-[7px] shrink-0 rounded-full", TONE_CLASSES[tone].dot, className)} />;
}

export function StatusBadge({ status }: { status: Status | null }) {
  const tone = toneOf(status);
  const classes = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-medium",
        classes.bg,
        classes.fg,
      )}
    >
      <span className={cn("size-1.5 rounded-full", classes.dot)} />
      {status ?? "Sem status"}
    </span>
  );
}
