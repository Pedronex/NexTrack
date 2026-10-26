import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  htmlFor?: string;
  aside?: string;
  help?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, aside, help, error, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-text-primary">
          {label}
        </label>
        {aside && <span className="text-xs text-text-tertiary">{aside}</span>}
      </div>
      {children}
      {(error || help) && (
        <p className={cn("text-xs", error ? "text-danger" : "text-text-tertiary")} role={error ? "alert" : undefined}>
          {error ?? help}
        </p>
      )}
    </div>
  );
}

const box =
  "flex w-full items-center gap-2 rounded-[5px] border bg-surface px-3 transition-colors focus-within:border-accent";

interface TextInputProps extends Omit<ComponentProps<"input">, "className"> {
  icon?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
  className?: string;
}

export function TextInput({ icon, trailing, invalid, className, ...props }: TextInputProps) {
  return (
    <div
      className={cn(
        box,
        "h-10",
        invalid ? "border-danger" : "border-border-strong",
        props.readOnly && "bg-surface-muted",
        className,
      )}
    >
      {icon && <span className="shrink-0 text-text-tertiary">{icon}</span>}
      <input
        aria-invalid={invalid || undefined}
        className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary read-only:font-semibold read-only:text-text-secondary"
        {...props}
      />
      {trailing && <span className="shrink-0 text-text-tertiary">{trailing}</span>}
    </div>
  );
}

export function TextArea({ className, ...props }: Omit<ComponentProps<"textarea">, "className"> & { className?: string }) {
  return (
    <div className={cn(box, "items-start py-2.5", "border-border-strong", className)}>
      <textarea
        rows={3}
        className="min-h-[60px] flex-1 resize-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
        {...props}
      />
    </div>
  );
}
