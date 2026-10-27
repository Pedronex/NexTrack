import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <p className="font-display text-2xl text-text-primary">NexTrack</p>
      <p className="mt-4 text-xs font-medium tracking-wide text-text-tertiary uppercase">{eyebrow}</p>
      <h1 className="mt-1 font-display text-[26px] leading-tight text-text-primary">{title}</h1>
      {description && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function AuthAlert({ message, tone = "error" }: { message: string; tone?: "error" | "info" }) {
  if (tone === "info") {
    return (
      <p
        role="status"
        className="rounded-md border border-accent bg-accent-faint px-3 py-2.5 text-[13px] text-text-primary"
      >
        {message}
      </p>
    );
  }
  return (
    <p role="alert" className="rounded-md border border-danger bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
      {message}
    </p>
  );
}

export function AuthLinks({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("mt-5 flex flex-col gap-2 text-center text-[13px] text-text-secondary", className)}>
      {children}
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="font-medium text-accent hover:underline">
      {children}
    </a>
  );
}
