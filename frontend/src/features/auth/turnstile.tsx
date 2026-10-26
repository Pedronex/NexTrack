"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string;
      reset: (id?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Widget Cloudflare Turnstile; grava o token num input hidden do formulário. */
export function Turnstile({ name = "captchaToken" }: { name?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  const render = useCallback(() => {
    if (!ref.current || !window.turnstile || !SITE_KEY) return;
    window.turnstile.render(ref.current, { sitekey: SITE_KEY, callback: setToken });
  }, []);

  useEffect(() => {
    if (ready) render();
  }, [ready, render]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onLoad={() => setReady(true)}
      />
      <div ref={ref} />
      <input type="hidden" name={name} value={token} />
    </>
  );
}
