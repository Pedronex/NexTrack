import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  label: string;
  fill?: boolean;
}

export function Segmented<T extends string>({ value, options, onChange, label, fill }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex gap-0.5 rounded-[5px] bg-surface-muted p-[3px]", fill ? "w-full" : "w-fit")}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-2.5 py-[7px] text-[13px] font-medium transition-colors",
              fill && "flex-1",
              selected
                ? "bg-surface text-text-primary shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
