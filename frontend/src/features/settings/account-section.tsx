"use client";

import { useState, useTransition } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { updateProfileAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { Me } from "@/lib/api/me";

export function AccountSection({ me }: { me: Me }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [signingOut, startSignOut] = useTransition();
  const [name, setName] = useState(me.displayName);

  const save = () =>
    startTransition(async () => {
      const res = await updateProfileAction({ displayName: name.trim() });
      if (res.ok) {
        toast.show({ kind: "success", title: "Nome atualizado" });
      } else {
        toast.show({ kind: "error", title: "Não foi possível salvar", description: res.message });
      }
    });

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-xl font-medium">Conta</h2>
        <p className="text-[13px] text-text-secondary">Seus dados de acesso ao NexTrack.</p>
      </div>
      <div className="flex flex-col rounded border border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-sm font-medium">Nome</p>
            <div className="max-w-[320px]">
              <TextInput
                aria-label="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <Button variant="secondary" size="sm" disabled={pending || name.trim() === me.displayName} onClick={save}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex flex-1 flex-col gap-px">
            <p className="text-sm font-medium">E-mail</p>
            <p className="text-xs text-text-secondary">
              {me.email ?? "—"}
              {me.email ? " · verificado" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-border px-6 py-4 md:hidden">
          <p className="flex-1 text-sm font-medium">Sessão</p>
          <Button variant="secondary" size="sm" disabled={signingOut} onClick={() => startSignOut(() => signOutAction())}>
            {signingOut ? "Saindo…" : "Sair"}
          </Button>
        </div>
      </div>
    </section>
  );
}
