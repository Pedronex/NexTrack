"use client";

import { useCallback, useEffect, useState } from "react";
import type { SpotifyPlayback } from "./types";

export type PlayerState =
  | { status: "loading" }
  | { status: "disconnected" }
  | { status: "expired" }
  | { status: "idle" }
  | { status: "error" }
  | { status: "playing" | "paused"; playback: SpotifyPlayback };

const BASE = "/api/spotify";

/** Só consulta com a aba visível e com conta ativa (evita martelar o Worker). */
export function shouldPoll(
  visibility: DocumentVisibilityState,
  status: PlayerState["status"],
): boolean {
  if (visibility === "hidden") return false;
  if (status === "disconnected" || status === "expired") return false;
  return true;
}

async function readPlayback(signal?: AbortSignal): Promise<PlayerState> {
  try {
    const res = await fetch(`${BASE}/currently-playing`, { signal, cache: "no-store" });
    if (res.status === 401) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      return { status: body?.code === "spotify_expired" ? "expired" : "disconnected" };
    }
    if (!res.ok) return { status: "error" };
    const playback = (await res.json()) as SpotifyPlayback;
    if (!playback.item) return { status: "idle" };
    return { status: playback.is_playing ? "playing" : "paused", playback };
  } catch {
    return { status: "error" };
  }
}

/** Lê o que está tocando no Spotify; com `pollMs`, atualiza a cada intervalo com a aba visível. */
export function useSpotifyPlayback(pollMs = 0) {
  const [state, setState] = useState<PlayerState>({ status: "loading" });

  const refresh = useCallback(async () => setState(await readPlayback()), []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      if (document.visibilityState === "hidden") return;
      const next = await readPlayback(controller.signal);
      if (controller.signal.aborted) return;
      setState(next);
    };

    load();
    if (pollMs) {
      timer = setInterval(() => {
        setState((current) => {
          if (shouldPoll(document.visibilityState, current.status)) load();
          return current;
        });
      }, pollMs);
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      controller.abort();
    };
  }, [pollMs]);

  return { state, refresh };
}

export type PlayerCommand = "play" | "pause" | "next" | "previous";

const COMMANDS: Record<PlayerCommand, { method: string; path: string }> = {
  play: { method: "PUT", path: "play" },
  pause: { method: "PUT", path: "pause" },
  next: { method: "POST", path: "next" },
  previous: { method: "POST", path: "previous" },
};

export async function sendPlayerCommand(command: PlayerCommand) {
  const { method, path } = COMMANDS[command];
  const res = await fetch(`${BASE}/${path}`, { method });
  return res.ok;
}
