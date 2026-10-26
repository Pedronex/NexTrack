"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signInWithProviderAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/cn";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path fill="#4285F4" d="M15.5 8.2c0-.7-.06-1.3-.17-1.9H8v3.5h4.3a3.7 3.7 0 0 1-1.6 2.4v2h2.6c1.5-1.4 2.2-3.4 2.2-6Z" />
      <path fill="#34A853" d="M8 16c2.2 0 4-.7 5.3-1.9l-2.6-2a4.8 4.8 0 0 1-7.1-2.5H.9v2.1A8 8 0 0 0 8 16Z" />
      <path fill="#FBBC05" d="M3.6 9.6a4.8 4.8 0 0 1 0-3.1V4.4H.9a8 8 0 0 0 0 7.2l2.7-2Z" />
      <path fill="#EA4335" d="M8 3.4c1.2 0 2.3.4 3.1 1.2l2.3-2.3A8 8 0 0 0 .9 4.4l2.7 2.1c.7-2 2.4-3.1 4.4-3.1Z" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="8" fill="#1DB954" />
      <path fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" d="M4.5 6.2c2.4-.7 4.9-.4 7 1M4.8 8.3c2-.6 4-.3 5.7.8M5 10.2c1.6-.5 3.2-.2 4.5.7" />
    </svg>
  );
}

export function SocialButtons({ next, className }: { next?: string; className?: string }) {
  const [pending, startTransition] = useTransition();

  const go = (provider: "google" | "spotify") =>
    startTransition(async () => {
      const res = await signInWithProviderAction(provider, next);
      if (res.ok) window.location.href = res.url;
    });

  return (
    <div className={cn("grid grid-cols-2 gap-2.5", className)}>
      <Button variant="secondary" disabled={pending} onClick={() => go("google")} className="w-full">
        <GoogleIcon /> Google
      </Button>
      <Button variant="secondary" disabled={pending} onClick={() => go("spotify")} className="w-full">
        <SpotifyIcon /> Spotify
      </Button>
    </div>
  );
}

export function DividerOu() {
  return (
    <div className="flex items-center gap-3 text-xs text-text-tertiary" aria-hidden>
      <span className="h-px flex-1 bg-border" />
      ou
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
