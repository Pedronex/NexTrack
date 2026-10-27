"use client";

import { CloudAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StateMessage
      icon={CloudAlert}
      tone="danger"
      className="pt-32"
      title="Não conseguimos carregar esta página"
      description={`Algo deu errado ao buscar seus dados. Tente de novo em instantes. Seus dados continuam seguros.${
        error.digest ? ` (código ${error.digest})` : ""
      }`}
      actions={<Button onClick={reset}>Tentar de novo</Button>}
    />
  );
}
