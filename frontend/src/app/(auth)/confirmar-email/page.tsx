import type { Metadata } from "next";
import { AuthCard, AuthLink, AuthLinks } from "@/features/auth/auth-card";
import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = { title: "Confirmar e-mail", robots: NO_INDEX };

export default function ConfirmEmailPage() {
  return (
    <AuthCard
      eyebrow="Quase lá"
      title="Confirme seu e-mail"
      description="Enviamos um link de confirmação para o seu e-mail. Abra a mensagem e clique no link para ativar sua conta."
    >
      <AuthLinks>
        <span>
          Já confirmou? <AuthLink href="/entrar">Entrar</AuthLink>
        </span>
        <span>
          Não recebeu? <AuthLink href="/cadastrar">Criar conta de novo</AuthLink>
        </span>
      </AuthLinks>
    </AuthCard>
  );
}
