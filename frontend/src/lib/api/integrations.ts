import "server-only";
import type { SpotifyDevice } from "@/lib/types";
import { api } from "./client";

export interface IntegrationStatus {
  notion: { ok: boolean; error?: string };
  spotify: { connected: boolean; devices: SpotifyDevice[] };
}

export async function checkNotion(): Promise<IntegrationStatus["notion"]> {
  try {
    await api("/health/notion");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

export async function getSpotifyStatus(): Promise<IntegrationStatus["spotify"]> {
  const { connected } = await api<{ connected: boolean }>("/spotify/status");
  if (!connected) return { connected, devices: [] };
  const result = await api<{ devices?: SpotifyDevice[] }>("/spotify/devices").catch(() => null);
  return { connected, devices: result?.devices ?? [] };
}

export const disconnectSpotify = () =>
  api<{ ok: true }>("/spotify/connection", { method: "DELETE" });
