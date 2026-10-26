import "server-only";
import type { SpotifyDevice } from "@/lib/types";
import { requireUser } from "@/lib/session";
import { api } from "./client";

export interface IntegrationStatus {
  notion: { ok: boolean; error?: string };
  spotify: { connected: boolean; devices: SpotifyDevice[] };
}

export async function checkNotion(): Promise<IntegrationStatus["notion"]> {
  try {
    const { accessToken } = await requireUser();
    await api("/health/notion", { token: accessToken });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

export async function getSpotifyStatus(): Promise<IntegrationStatus["spotify"]> {
  const { accessToken } = await requireUser();
  const { connected } = await api<{ connected: boolean }>("/spotify/status", {
    token: accessToken,
  });
  if (!connected) return { connected, devices: [] };
  const result = await api<{ devices?: SpotifyDevice[] }>("/spotify/devices", {
    token: accessToken,
  }).catch(() => null);
  return { connected, devices: result?.devices ?? [] };
}

export async function disconnectSpotify(): Promise<{ ok: true }> {
  const { accessToken } = await requireUser();
  return api<{ ok: true }>("/spotify/connection", { method: "DELETE", token: accessToken });
}
