import { BookPlus, CircleCheck, CircleDashed, Music, NotebookPen } from "lucide-react";
import { OpenBookButton, OpenSessionButton } from "@/components/modals/modal-buttons";
import type { FirstStep } from "@/lib/domain/first-steps";
import { cn } from "@/lib/cn";

const STEP_META: Record<FirstStep["id"], { title: string; description: string; icon: typeof BookPlus }> = {
  book: {
    title: "Cadastre seu primeiro livro",
    description: "O que você está lendo agora ou quer ler em breve.",
    icon: BookPlus,
  },
  session: {
    title: "Registre uma sessão de leitura",
    description: "Páginas lidas, tempo e como foi a leitura.",
    icon: NotebookPen,
  },
  spotify: {
    title: "Conecte o Spotify",
    description: "Veja o que está tocando enquanto lê.",
    icon: Music,
  },
};

/** Tela "Bem-vindo" com o checklist de primeiro acesso (frame Dashboard — primeiro acesso). */
export function FirstSteps({ name, steps }: { name: string; steps: FirstStep[] }) {
  return (
    <div className="flex flex-col gap-8 px-4 sm:px-6 lg:px-10 pt-1 pb-16">
      <p className="max-w-[760px] font-display text-[23px] leading-snug text-text-secondary">
        Bem-vindo{ name ? `, ${name}` : ""}! Complete os passos abaixo para começar.
      </p>
      <ol className="flex max-w-[760px] flex-col rounded border border-border bg-surface">
        {steps.map((step, index) => {
          const meta = STEP_META[step.id];
          const Icon = meta.icon;
          return (
            <li
              key={step.id}
              className="flex items-center gap-4 px-6 py-4 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-secondary">
                <Icon size={18} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-px">
                <p className="text-sm font-medium">
                  <span className="mr-2 text-xs text-text-tertiary">{index + 1}</span>
                  {meta.title}
                </p>
                <p className="text-xs text-text-secondary">{meta.description}</p>
              </div>
              {step.done ? (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-success">
                  <CircleCheck size={16} /> Feito
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[13px] text-text-tertiary">
                  <CircleDashed size={16} /> Pendente
                </span>
              )}
              {!step.done && step.id === "book" && <OpenBookButton>Novo livro</OpenBookButton>}
              {!step.done && step.id === "session" && <OpenSessionButton>Nova sessão</OpenSessionButton>}
              {!step.done && step.id === "spotify" && (
                <a
                  href="/configuracoes"
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-md bg-ink px-3.5 py-[9px]",
                    "text-[13px] font-medium whitespace-nowrap text-ink-fg hover:opacity-90",
                  )}
                >
                  Conectar
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
