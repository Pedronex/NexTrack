"use client";

import { useState } from "react";
import { AuthCard, AuthLink, AuthLinks } from "@/features/auth/auth-card";
import { ForgotForm } from "@/features/auth/forgot-form";

export default function ForgotPage() {
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  if (sentEmail) {
    return (
      <AuthCard
        eyebrow="E-mail enviado"
        title="Verifique sua caixa de entrada"
        description={`Se ${sentEmail} estiver cadastrado, você recebe um link para redefinir a senha em instantes.`}
      >
        <AuthLinks>
          <AuthLink href="/entrar">Voltar para entrar</AuthLink>
        </AuthLinks>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      eyebrow="Recuperar acesso"
      title="Esqueci minha senha"
      description="Informe seu e-mail para receber o link de redefinição."
    >
      <ForgotForm onDone={setSentEmail} />
      <AuthLinks>
        <AuthLink href="/entrar">Voltar para entrar</AuthLink>
      </AuthLinks>
    </AuthCard>
  );
}
