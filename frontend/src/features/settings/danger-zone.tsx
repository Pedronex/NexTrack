"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChangePasswordDialog } from "./change-password-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function DangerZone() {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-xl font-medium text-danger">Zona de risco</h2>
        <p className="text-[13px] text-text-secondary">Ações permanentes da sua conta.</p>
      </div>
      <div className="flex flex-col rounded border border-danger bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex flex-1 flex-col gap-px">
            <p className="text-sm font-medium">Alterar senha</p>
            <p className="text-xs text-text-secondary">Troque a senha da sua conta.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setPasswordOpen(true)}>
            Alterar
          </Button>
        </div>
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex flex-1 flex-col gap-px">
            <p className="text-sm font-medium">Excluir conta</p>
            <p className="text-xs text-text-secondary">Apaga livros, sessões e conexões para sempre.</p>
          </div>
          <Button variant="danger-outline" size="sm" onClick={() => setDeleteOpen(true)}>
            Excluir
          </Button>
        </div>
      </div>
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </section>
  );
}
