"use client";

import { useState, useTransition } from "react";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { AuthAlert } from "@/features/auth/auth-card";
import { Turnstile } from "@/features/auth/turnstile";

export function ForgotForm({ onDone }: { onDone: (email: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = (formData: FormData) =>
    startTransition(async () => {
      setError(null);
      setFieldErrors({});
      const res = await forgotPasswordAction(formData);
      if (res.ok) {
        onDone(String(formData.get("email") ?? ""));
      } else {
        setError(res.message);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });

  return (
    <form action={submit} className="flex flex-col gap-4">
      {error && <AuthAlert message={error} />}
      <Field label="E-mail" htmlFor="email" error={fieldErrors.email}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          invalid={!!fieldErrors.email}
        />
      </Field>
      <Turnstile />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando…" : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
