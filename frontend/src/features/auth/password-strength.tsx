"use client";

import { passwordStrength, passwordStrengthLabel } from "@/lib/auth-validation";
import { cn } from "@/lib/cn";

export function PasswordStrength({ password }: { password: string }) {
  const level = passwordStrength(password);
  if (!password) return null;
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i < level ? (level <= 1 ? "bg-danger" : level === 2 ? "bg-warning" : "bg-success") : "bg-surface-sunken",
            )}
          />
        ))}
      </div>
      <span className="text-xs text-text-tertiary">{passwordStrengthLabel[level]}</span>
    </div>
  );
}
