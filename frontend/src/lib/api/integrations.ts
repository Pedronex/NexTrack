import "server-only";
import type { SpotifyDevice } from "@/lib/types";
import { requireUser } from "@/lib/session";
import { api } from "./client";

export interface IntegrationStatus {
  spotify: {
    connected: boolean;
    status: "connected" | "expired" | "disconnected";
    name: string | null;
    product: string | null;
    devices: SpotifyDevice[];
  };
}

export async function getSpotifyStatus(): Promise<IntegrationStatus["spotify"]> {
  const { accessToken } = await requireUser();
  const status = await api<{
    connected: boolean;
    status: "connected" | "expired" | "disconnected";
    name: string | null;
    product: string | null;
    devices?: SpotifyDevice[];
  }>("/spotify/status", { token: accessToken });
  return {
    connected: status.connected,
    status: status.status,
    name: status.name ?? null,
    product: status.product ?? null,
    devices: status.devices ?? [],
  };
}

export async function disconnectSpotify(): Promise<{ ok: true }> {
  const { accessToken } = await requireUser();
  return api<{ ok: true }>("/spotify/connection", { method: "DELETE", token: accessToken });
}

export async function getSpotifyConnectUrl(): Promise<string> {
  const { accessToken } = await requireUser();
  const { url } = await api<{ url: string }>("/spotify/connect", {
    method: "POST",
    token: accessToken,
  });
  return url;
}
