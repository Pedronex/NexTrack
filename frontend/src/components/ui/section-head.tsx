import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionHeadProps {
  title: string;
  subtitle?: string;
  /** Tamanho do título: seções de página (20) ou blocos menores (18). */
  size?: "md" | "sm";
  action?: ReactNode;
  className?: string;
}

export function SectionHead({ title, subtitle, size = "md", action, className }: SectionHeadProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 className={cn("font-display font-medium text-text-primary", size === "md" ? "text-xl" : "text-lg")}>
          {title}
        </h2>
        {subtitle && <p className="text-[13px] text-text-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
