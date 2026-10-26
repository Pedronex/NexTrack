"use client";

import { useState, useTransition } from "react";
import { signUpAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { AuthAlert } from "@/features/auth/auth-card";
import { PasswordStrength } from "@/features/auth/password-strength";
import { Turnstile } from "@/features/auth/turnstile";

export function SignUpForm({ onDone }: { onDone: (email: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");

  const submit = (formData: FormData) =>
    startTransition(async () => {
      setError(null);
      setFieldErrors({});
      const res = await signUpAction(formData);
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
      <Field label="Nome" htmlFor="name" error={fieldErrors.name}>
        <TextInput
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Como prefere ser chamado"
          invalid={!!fieldErrors.name}
        />
      </Field>
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
      <Field label="Senha" htmlFor="password" aside="mínimo 8 caracteres" error={fieldErrors.password}>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Crie uma senha"
          invalid={!!fieldErrors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <PasswordStrength password={password} />
      <Turnstile />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Criando conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
