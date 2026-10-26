import { BookX } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";

export default function BookNotFound() {
  return (
    <>
      <TopBar eyebrow="Biblioteca" title="Detalhe do livro" />
      <StateMessage
        icon={BookX}
        tone="danger"
        title="Livro não encontrado"
        description="Ele pode ter sido excluído ou movido no Notion."
        actions={<ButtonLink href="/biblioteca">Voltar à biblioteca</ButtonLink>}
      />
    </>
  );
}
