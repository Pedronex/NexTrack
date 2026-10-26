"use client";

import { useCallback, useEffect, useState } from "react";
import type { SpotifyPlayback } from "./types";

export type PlayerState =
  | { status: "loading" }
  | { status: "disconnected" }
  | { status: "idle" }
  | { status: "error" }
  | { status: "playing" | "paused"; playback: SpotifyPlayback };

const BASE = "/backend/spotify";

async function readPlayback(signal?: AbortSignal): Promise<PlayerState> {
  try {
    const res = await fetch(`${BASE}/currently-playing`, { signal, cache: "no-store" });
    if (res.status === 401) return { status: "disconnected" };
    if (!res.ok) return { status: "error" };
    const playback = (await res.json()) as SpotifyPlayback;
    if (!playback.item) return { status: "idle" };
    return { status: playback.is_playing ? "playing" : "paused", playback };
  } catch {
    return { status: "error" };
  }
}

/** Lê o que está tocando no Spotify; com `pollMs`, atualiza periodicamente. */
export function useSpotifyPlayback(pollMs = 0) {
  const [state, setState] = useState<PlayerState>({ status: "loading" });

  const refresh = useCallback(async () => setState(await readPlayback()), []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      const next = await readPlayback(controller.signal);
      if (controller.signal.aborted) return;
      setState(next);
      // Sem conta conectada não há o que acompanhar; evita requisições 401 repetidas.
      if (next.status === "disconnected") clearInterval(timer);
    };

    load();
    if (pollMs) timer = setInterval(load, pollMs);
    return () => {
      clearInterval(timer);
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
