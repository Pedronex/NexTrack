"use client";

import { useState, useTransition } from "react";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { AuthAlert } from "@/features/auth/auth-card";
import { PasswordStrength } from "@/features/auth/password-strength";

export function ResetForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");

  const submit = (formData: FormData) =>
    startTransition(async () => {
      setError(null);
      setFieldErrors({});
      const res = await resetPasswordAction(formData);
      if (!res.ok) {
        setError(res.message);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });

  return (
    <form action={submit} className="flex flex-col gap-4">
      {error && <AuthAlert message={error} />}
      <Field label="Nova senha" htmlFor="password" aside="mínimo 8 caracteres" error={fieldErrors.password}>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Nova senha"
          invalid={!!fieldErrors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <PasswordStrength password={password} />
      <Field label="Confirmar senha" htmlFor="confirm" error={fieldErrors.confirm}>
        <TextInput
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a nova senha"
          invalid={!!fieldErrors.confirm}
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando…" : "Redefinir senha"}
      </Button>
    </form>
  );
}
