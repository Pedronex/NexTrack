"use client";

import { useState, useTransition } from "react";
import { changePasswordAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { PasswordStrength } from "@/features/auth/password-strength";
import { validatePassword, validatePasswordMatch } from "@/lib/auth-validation";

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const submit = () =>
    startTransition(async () => {
      const fieldErrors: Record<string, string> = {};
      if (!current) fieldErrors.current = "Informe sua senha atual.";
      const nextError = validatePassword(next);
      if (nextError) fieldErrors.next = nextError;
      const matchError = validatePasswordMatch(next, confirm);
      if (matchError) fieldErrors.confirm = matchError;
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length > 0) return;
      const res = await changePasswordAction(current, next);
      if (res.ok) {
        toast.show({ kind: "success", title: "Senha alterada" });
        onClose();
      } else {
        setErrors({ current: res.message });
      }
    });

  return (
    <div role="dialog" aria-modal aria-label="Alterar senha" className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-[440px] rounded-[14px] bg-surface p-6 shadow-2xl">
        <h2 className="font-display text-[22px] font-medium">Alterar senha</h2>
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Senha atual" htmlFor="current-password" error={errors.current}>
            <TextInput
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              invalid={!!errors.current}
            />
          </Field>
          <Field label="Nova senha" htmlFor="new-password" aside="mínimo 8 caracteres" error={errors.next}>
            <TextInput
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              invalid={!!errors.next}
            />
          </Field>
          <PasswordStrength password={next} />
          <Field label="Confirmar nova senha" htmlFor="confirm-password" error={errors.confirm}>
            <TextInput
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              invalid={!!errors.confirm}
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Salvando…" : "Alterar senha"}
          </Button>
        </div>
      </div>
    </div>
  );
}
