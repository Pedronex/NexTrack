import type { Metadata } from "next";
import { AuthAlert, AuthCard, AuthLink, AuthLinks } from "@/features/auth/auth-card";
import { SignInForm } from "@/features/auth/signin-form";
import { DividerOu, SocialButtons } from "@/features/auth/social-buttons";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next, erro } = await searchParams;
  return (
    <AuthCard eyebrow="Boas-vindas de volta" title="Entrar" description="Acompanhe suas leituras de onde parou.">
      {erro === "provedor" && <div className="mb-4"><AuthAlert message="Falha no provedor. Tente de novo." /></div>}
      <div className="flex flex-col gap-4">
        <SocialButtons next={next} />
        <DividerOu />
        <SignInForm next={next} />
        <AuthLinks>
          <span>
            Não tem conta? <AuthLink href="/cadastrar">Criar conta</AuthLink>
          </span>
          <AuthLink href="/esqueci-senha">Esqueci minha senha</AuthLink>
        </AuthLinks>
      </div>
    </AuthCard>
  );
}
