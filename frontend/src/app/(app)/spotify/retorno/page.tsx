import type { Metadata } from "next";
import { SpotifyReturn } from "@/features/settings/spotify-return";

export const metadata: Metadata = { title: "Conectar Spotify" };

export default async function SpotifyReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; state?: string; error?: string }>;
}) {
  const { code, state, error } = await searchParams;
  return <SpotifyReturn code={code} state={state} error={error} />;
}
