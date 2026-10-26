"use client";

import { Plug2, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { disconnectSpotifyAction, testNotionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function TestNotionButton() {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await testNotionAction();
          toast.show(
            result.ok
              ? { kind: "success", title: "Notion conectado", description: "A base respondeu normalmente." }
              : { kind: "error", title: "Falha na conexão com o Notion", description: result.message },
          );
          router.refresh();
        })
      }
    >
      <Plug2 size={14} />
      {pending ? "Testando…" : "Testar conexão"}
    </Button>
  );
}

export function DisconnectSpotifyButton() {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="danger-outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await disconnectSpotifyAction();
          toast.show(
            result.ok
              ? { kind: "success", title: "Spotify desconectado" }
              : { kind: "error", title: "Não foi possível desconectar", description: result.message },
          );
          router.refresh();
        })
      }
    >
      <Unplug size={14} />
      Desconectar
    </Button>
  );
}
