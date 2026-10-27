"use client";

import { CircleUserRound, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import type { Me } from "@/lib/api/me";
import { initialsOf } from "@/lib/initials";
import { cn } from "@/lib/cn";

/** Bloco de usuário no rodapé da sidebar, com menu (Minha conta, Configurações, Sair). */
export function UserMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const name = me.displayName || me.email || "Conta";

  const signOut = () =>
    startTransition(async () => {
      await signOutAction();
    });

  return (
    <div className="relative">
      {open && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-52 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
          <Link
            href="/configuracoes"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text-primary hover:bg-surface-muted"
          >
            <CircleUserRound size={16} className="text-text-secondary" /> Minha conta
          </Link>
          <Link
            href="/configuracoes"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text-primary hover:bg-surface-muted"
          >
            <Settings size={16} className="text-text-secondary" /> Configurações
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={signOut}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-danger hover:bg-danger-soft disabled:opacity-50"
          >
            <LogOut size={16} /> {pending ? "Saindo…" : "Sair"}
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu da conta"
        className={cn(
          "flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[5px] px-2.5 py-2 text-left transition-colors lg:justify-start",
          open ? "bg-surface-sunken" : "hover:bg-surface-muted",
        )}
      >
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[13px] font-semibold text-text-primary"
        >
          {initialsOf(name)}
        </span>
        <span className="hidden min-w-0 flex-1 lg:block">
          <span className="block truncate text-sm font-medium text-text-primary">{name}</span>
          {me.email && (
            <span className="block truncate text-xs text-text-tertiary">{me.email}</span>
          )}
        </span>
      </button>
    </div>
  );
}
