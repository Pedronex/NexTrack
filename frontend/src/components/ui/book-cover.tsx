import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { coverFor } from "@/lib/domain/cover";

const SIZES = {
  xs: { box: "h-8 w-[22px] rounded-[1px_2px_2px_1px] p-[3px_3px_3px_4px]", text: "text-[9px]", rule: false },
  sm: { box: "h-11 w-[30px] rounded-[1px_3px_3px_1px] p-1 pl-[5px]", text: "text-[11px]", rule: false },
  md: { box: "h-[50px] w-[34px] rounded-[1px_3px_3px_1px] p-[5px_5px_5px_6px]", text: "text-xs", rule: false },
  lg: { box: "h-[194px] w-[132px] rounded-[3px_8px_8px_3px] p-[16px_14px_16px_18px]", text: "text-[34px]", rule: true },
  xl: { box: "h-[228px] w-[156px] rounded-[3px_8px_8px_3px] p-[18px_18px_18px_22px]", text: "text-[40px]", rule: true },
  fill: { box: "h-[276px] w-full rounded-[3px_8px_8px_3px] p-[18px_18px_18px_22px]", text: "text-[40px]", rule: true },
} as const;

export type CoverSize = keyof typeof SIZES;

interface BookCoverProps {
  title: string;
  size?: CoverSize;
  className?: string;
}

/** Capa gerada: iniciais do título sobre uma cor estável derivada dele. */
export function BookCover({ title, size = "sm", className }: BookCoverProps) {
  const { initials, color } = coverFor(title);
  const { box, text, rule } = SIZES[size];
  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col justify-between overflow-hidden bg-(--cover)",
        box,
        className,
      )}
      style={{ "--cover": color } as CSSProperties}
      aria-hidden
    >
      <span className="absolute inset-y-0 left-0 w-[3px] bg-black/15" />
      <span className={cn("font-display leading-none text-white/90", text)}>{initials}</span>
      {rule && <span className="h-[1.5px] w-4 bg-white/50" />}
    </div>
  );
}
