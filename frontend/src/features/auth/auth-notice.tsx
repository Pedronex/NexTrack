"use client";

import { useSyncExternalStore } from "react";
import { parseAuthRedirectError } from "@/lib/auth-errors";
import { AuthAlert } from "./auth-card";

// O Supabase devolve erros de OAuth no fragmento da URL (#error=…), que o servidor não enxerga.
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}

const snapshot = () => `${window.location.search}${window.location.hash}`;

/** Aviso, na tela de entrada, sobre o retorno de um login com provedor (Google, Spotify). */
export function AuthNotice() {
  const location = useSyncExternalStore(subscribe, snapshot, () => "");
  // O fragmento traz o código do erro; a query só marca "erro=provedor". O fragmento tem prioridade.
  const [search, hash = ""] = location.split("#");
  const notice = parseAuthRedirectError(hash) ?? parseAuthRedirectError(search);
  if (!notice) return null;
  return (
    <div className="mb-4">
      <AuthAlert message={notice.message} tone={notice.tone} />
    </div>
  );
}
