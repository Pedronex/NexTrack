import { cn } from "@/lib/cn";

/** Símbolo NexTrack (marcador + ponto "lendo"); inline para seguir o data-theme. Espelha public/brand/nextrack-mark.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-6 shrink-0", className)}>
      <path
        className="fill-ink stroke-ink"
        strokeWidth={2}
        strokeLinejoin="round"
        d="M10 4h12a2 2 0 0 1 2 2v21l-8-5.5L8 27V6a2 2 0 0 1 2-2Z"
      />
      <circle className="fill-reading-dot" cx={16} cy={11} r={3} />
    </svg>
  );
}
