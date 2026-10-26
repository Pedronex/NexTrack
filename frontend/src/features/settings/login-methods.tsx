"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { linkProviderAction, unlinkProviderAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const LABELS: Record<string, string> = { email: "E-mail e senha", google: "Google", spotify: "Spotify" };
const ALL = ["email", "google", "spotify"] as const;

export function LoginMethods({ providers }: { providers: string[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const link = (provider: "google" | "spotify") =>
    startTransition(async () => {
      const res = await linkProviderAction(provider);
      if (res.ok) window.location.href = res.url;
      else toast.show({ kind: "error", title: "Não foi possível vincular", description: res.message });
    });

  const unlink = (provider: string) =>
    startTransition(async () => {
      const res = await unlinkProviderAction(provider);
      toast.show(
        res.ok
          ? { kind: "success", title: `${LABELS[provider] ?? provider} desvinculado` }
          : { kind: "error", title: "Não foi possível desvincular", description: res.message },
      );
      if (res.ok) router.refresh();
    });

  return (
    <div className="flex flex-col rounded border border-border bg-surface">
      {ALL.map((provider) => {
        const linked = providers.includes(provider);
        return (
          <div key={provider} className="flex items-center gap-3 border-b border-border px-6 py-4 last:border-b-0">
            <div className="flex flex-1 flex-col gap-px">
              <p className="text-sm font-medium">{LABELS[provider]}</p>
              <p className="text-xs text-text-secondary">{linked ? "Vinculado" : "Não vinculado"}</p>
            </div>
            {linked ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={pending || providers.length <= 1}
                onClick={() => unlink(provider)}
                title={providers.length <= 1 ? "Mantenha ao menos um método de login" : undefined}
              >
                Desvincular
              </Button>
            ) : provider === "email" ? (
              <Button variant="secondary" size="sm" disabled title="Em breve">
                Em breve
              </Button>
            ) : (
              <Button variant="secondary" size="sm" disabled={pending} onClick={() => link(provider)}>
                Vincular
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
