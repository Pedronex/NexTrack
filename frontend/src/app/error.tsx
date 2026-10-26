"use client";

import { CloudAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";

export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <StateMessage
      icon={CloudAlert}
      tone="danger"
      className="pt-32"
      title="Não conseguimos carregar esta página"
      description={
        error.message
          ? `${error.message} Seus dados continuam seguros no Notion.`
          : "O Notion demorou para responder. Seus dados estão seguros."
      }
      actions={<Button onClick={reset}>Tentar de novo</Button>}
    />
  );
}
