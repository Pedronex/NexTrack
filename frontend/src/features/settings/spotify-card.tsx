"use client";

import { Music } from "lucide-react";
import { useTransition } from "react";
import { connectSpotifyAction } from "@/app/actions";

/** Pede a URL de autorização ao Worker e redireciona o navegador para o Spotify. */
export function ConnectSpotifyButton({ label = "Conectar com Spotify" }: { label?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => connectSpotifyAction())}
      className="flex cursor-pointer items-center gap-2 rounded-full bg-spotify px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
    >
      <Music size={15} />
      {pending ? "Redirecionando…" : label}
    </button>
  );
}
