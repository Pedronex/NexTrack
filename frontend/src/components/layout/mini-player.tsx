"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { sendPlayerCommand, useSpotifyPlayback } from "@/lib/use-spotify";

const POLL_MS = 5000;

const shell = "mx-0 mt-2 flex flex-col gap-3 rounded-md border border-border px-2.5 pt-4 pb-1";

export function MiniPlayer() {
  const { state, refresh } = useSpotifyPlayback(POLL_MS);

  if (state.status === "loading" || state.status === "error") return null;

  if (state.status === "disconnected") {
    return (
      <div className={cn(shell, "pb-3")}>
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
          <span className="size-[7px] rounded-full bg-text-tertiary" />
          Spotify desconectado
        </p>
        <Link href="/configuracoes" className="text-xs text-text-secondary underline-offset-2 hover:underline">
          Conectar nas configurações
        </Link>
      </div>
    );
  }

  if (state.status === "idle") {
    return (
      <div className={cn(shell, "bg-surface-muted pb-3")}>
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
          <span className="size-[7px] rounded-full bg-text-tertiary" />
          Spotify pausado
        </p>
        <p className="text-xs text-text-secondary">Nada tocando agora. Dê play em algum dispositivo.</p>
      </div>
    );
  }

  const { item, progress_ms = 0 } = state.playback;
  if (!item) return null;
  const playing = state.status === "playing";
  const art = item.album.images.at(-1)?.url;
  const progress = item.duration_ms > 0 ? Math.min(100, (progress_ms / item.duration_ms) * 100) : 0;

  const command = async (name: Parameters<typeof sendPlayerCommand>[0]) => {
    await sendPlayerCommand(name);
    setTimeout(refresh, 400);
  };

  return (
    <div className={shell}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
        <span className={cn("size-[7px] rounded-full", playing ? "bg-spotify" : "bg-text-tertiary")} />
        {playing ? "Tocando no Spotify" : "Pausado no Spotify"}
      </p>
      <div className="flex items-center gap-2.5">
        {art ? (
          <Image src={art} alt="" width={38} height={38} className="size-[38px] rounded-md" />
        ) : (
          <span className="size-[38px] rounded-md bg-surface-sunken" />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-[13px] font-medium">{item.name}</p>
          <p className="truncate text-xs text-text-secondary">{item.artists.map((a) => a.name).join(", ")}</p>
        </div>
      </div>
      <div className="h-[3px] rounded-sm bg-border-strong">
        <div className="h-full rounded-sm bg-text-primary" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-center gap-2 pb-2">
        <button type="button" aria-label="Anterior" onClick={() => command("previous")} className="cursor-pointer text-text-secondary hover:text-text-primary">
          <SkipBack size={15} />
        </button>
        <button
          type="button"
          aria-label={playing ? "Pausar" : "Tocar"}
          onClick={() => command(playing ? "pause" : "play")}
          className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-ink text-ink-fg"
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button type="button" aria-label="Próxima" onClick={() => command("next")} className="cursor-pointer text-text-secondary hover:text-text-primary">
          <SkipForward size={15} />
        </button>
      </div>
    </div>
  );
}
