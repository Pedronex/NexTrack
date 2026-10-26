import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-ink text-ink-fg hover:opacity-90",
  secondary: "border border-border-strong text-text-primary hover:bg-surface-muted",
  danger: "bg-danger text-white hover:opacity-90",
  "danger-outline": "border border-danger text-danger hover:bg-danger-soft",
  ghost: "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
} as const;

const sizes = {
  md: "px-3.5 py-[9px] text-[13px]",
  sm: "px-2.5 py-1.5 text-xs",
} as const;

interface StyleProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

const styles = ({ variant = "primary", size = "md" }: StyleProps, className?: string) =>
  cn(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={styles({ variant, size }, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={styles({ variant, size }, className)} {...props} />;
}
