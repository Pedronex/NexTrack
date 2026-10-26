import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/auth-card";
import { ResetForm } from "@/features/auth/reset-form";

export const metadata: Metadata = { title: "Redefinir senha" };

export default function ResetPage() {
  return (
    <AuthCard
      eyebrow="Recuperar acesso"
      title="Redefinir senha"
      description="Escolha uma nova senha para sua conta."
    >
      <ResetForm />
    </AuthCard>
  );
}
