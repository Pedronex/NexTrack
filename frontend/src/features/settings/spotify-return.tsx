"use client";

import { CircleCheck, Music } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/states";

type Phase = "conectando" | "conectado" | "erro";

/** Retorno do OAuth do Spotify: repassa code+state ao Worker já autenticado. */
export function SpotifyReturn({ code, state, error }: { code?: string; state?: string; error?: string }) {
  const [phase, setPhase] = useState<Phase>(error || !code || !state ? "erro" : "conectando");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "conectando" || !code || !state) return;
    let cancelled = false;
    fetch("/api/spotify/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          setPhase("conectado");
        } else {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setDetail(body?.error ?? null);
          setPhase("erro");
        }
      })
      .catch(() => {
        if (!cancelled) setPhase("erro");
      });
    return () => {
      cancelled = true;
    };
  }, [phase, code, state]);

  if (phase === "conectando") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="size-11 animate-shimmer rounded-[5px] bg-spotify text-white flex items-center justify-center">
          <Music size={22} />
        </span>
        <h1 className="font-display text-2xl">Conectando ao Spotify…</h1>
        <p className="text-sm text-text-secondary">Finalizando a autorização.</p>
        <Skeleton className="h-2 w-40" />
      </div>
    );
  }

  if (phase === "conectado") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CircleCheck size={44} className="text-success" />
        <h1 className="font-display text-2xl">Spotify conectado</h1>
        <p className="text-sm text-text-secondary">O mini player já mostra o que está tocando.</p>
        <div className="mt-2 flex gap-2.5">
          <Link
            href="/"
            className="rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-ink-fg hover:opacity-90"
          >
            Ir para o dashboard
          </Link>
          <Link
            href="/configuracoes"
            className="rounded-md border border-border-strong px-4 py-2 text-[13px] font-medium hover:bg-surface-muted"
          >
            Configurações
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-[5px] bg-danger-soft text-danger">
        <Music size={22} />
      </span>
      <h1 className="font-display text-2xl">Não foi possível conectar</h1>
      <p className="text-sm text-text-secondary">
        {detail ?? "A autorização expirou ou foi negada. Tente de novo."}
      </p>
      <Link
        href="/configuracoes"
        className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-ink px-3.5 py-[9px] text-[13px] font-medium text-ink-fg hover:opacity-90"
      >
        Voltar para configurações
      </Link>
    </div>
  );
}
