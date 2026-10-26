import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: ReactNode;
  tone?: "neutral" | "danger";
  className?: string;
}

/** Estado vazio ou de erro, centralizado no espaço disponível. */
export function StateMessage({ icon: Icon, title, description, actions, tone = "neutral", className }: StateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-16 text-center", className)}>
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full",
          tone === "danger" ? "bg-danger-soft text-danger" : "bg-surface-muted text-text-secondary",
        )}
      >
        <Icon size={18} />
      </span>
      <h2 className="font-display text-xl font-medium text-text-primary">{title}</h2>
      <p className="max-w-sm text-[13px] text-text-secondary">{description}</p>
      {actions && <div className="mt-1 flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-md bg-surface-sunken", className)} />;
}
