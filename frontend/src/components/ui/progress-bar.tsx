import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { TONE_CLASSES, type Tone } from "@/lib/domain/books";

const HEIGHTS = { sm: "h-[3px]", md: "h-1", lg: "h-2" } as const;

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  tone?: Tone | "accent";
  size?: keyof typeof HEIGHTS;
  className?: string;
}

export function ProgressBar({ value, tone = "reading", size = "md", className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("w-full overflow-hidden rounded-full bg-surface-sunken", HEIGHTS[size], className)}
    >
      <div
        className={cn(
          "h-full w-(--value) rounded-full",
          tone === "accent" ? "bg-accent" : TONE_CLASSES[tone].dot,
        )}
        style={{ "--value": `${clamped}%` } as CSSProperties}
      />
    </div>
  );
}
