"use client";

import { useState } from "react";
import { AuthCard, AuthLink, AuthLinks } from "@/features/auth/auth-card";
import { SignUpForm } from "@/features/auth/signup-form";
import { DividerOu, SocialButtons } from "@/features/auth/social-buttons";

function Created({ email }: { email: string }) {
  return (
    <AuthCard
      eyebrow="Conta criada"
      title="Confira sua caixa de entrada"
      description={`Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta e começar.`}
    >
      <AuthLinks>
        <span>
          Já confirmou? <AuthLink href="/entrar">Entrar</AuthLink>
        </span>
      </AuthLinks>
    </AuthCard>
  );
}

export default function SignUpPage() {
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  if (createdEmail) return <Created email={createdEmail} />;
  return (
    <AuthCard eyebrow="Comece grátis" title="Criar conta" description="Sua biblioteca, sessões e Spotify num só lugar.">
      <div className="flex flex-col gap-4">
        <SocialButtons />
        <DividerOu />
        <SignUpForm onDone={setCreatedEmail} />
        <AuthLinks>
          <span>
            Já tem conta? <AuthLink href="/entrar">Entrar</AuthLink>
          </span>
        </AuthLinks>
      </div>
    </AuthCard>
  );
}
