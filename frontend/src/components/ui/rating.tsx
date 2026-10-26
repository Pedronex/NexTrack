import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface RatingProps {
  value: number | null;
  size?: number;
}

/** Estrelas somente leitura. */
export function Rating({ value, size = 12 }: RatingProps) {
  if (value === null || value <= 0) return <span className="text-[13px] text-text-tertiary">—</span>;
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={cn(i < Math.round(value) ? "fill-paused-dot text-paused-dot" : "fill-border-strong text-border-strong")}
        />
      ))}
    </span>
  );
}
