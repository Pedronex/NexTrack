"use client";

import { ArrowRight, Check, Info } from "lucide-react";
import { useState, useTransition } from "react";
import { updateProgressAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { StatusDot } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { STATUS_TONE, TONE_CLASSES, progressPercent } from "@/lib/domain/books";
import type { Book, Status } from "@/lib/types";

const EDITABLE_STATUSES: Status[] = ["Quero ler", "Lendo", "Pausado", "Concluído"];

export function QuickUpdate({ book }: { book: Book }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [page, setPage] = useState(String(book.currentPage ?? 0));
  const [error, setError] = useState<string | null>(null);

  const next = Number(page);
  const valid = page.trim() !== "" && Number.isInteger(next) && next >= 0 && (!book.totalPages || next <= book.totalPages);
  const changed = valid && next !== (book.currentPage ?? 0);

  function save(currentPage: number, status?: Status) {
    setError(null);
    startTransition(async () => {
      const result = await updateProgressAction(book.id, currentPage, status);
      if (!result.ok) return setError(result.message);
      toast.show({
        kind: "success",
        title: "Progresso atualizado",
        description: `${book.title} na pág. ${result.data.currentPage} (${progressPercent(result.data)}%).`,
      });
    });
  }

  return (
    <aside className="flex w-full flex-col gap-5 rounded border border-border bg-surface p-6 xl:w-[340px] xl:shrink-0">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-lg font-medium">Atualização rápida</h2>
        <p className="text-[13px] text-text-secondary">Ajuste a página sem registrar uma sessão</p>
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (changed) save(next);
        }}
      >
        <Field label="Página atual" htmlFor="quick-page" error={error ?? (valid ? undefined : "Página fora do intervalo")}>
          <div className="flex gap-2">
            <div className="flex h-10 flex-1 items-center gap-1.5 rounded-[5px] border border-border-strong bg-surface px-3 focus-within:border-accent">
              <input
                id="quick-page"
                type="number"
                min={0}
                max={book.totalPages ?? undefined}
                value={page}
                onChange={(event) => setPage(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none"
              />
              {book.totalPages && <span className="text-[13px] text-text-tertiary">/ {book.totalPages}</span>}
            </div>
            <Button type="submit" disabled={!changed || pending} className="h-10">
              Salvar
            </Button>
          </div>
        </Field>
        {changed && book.totalPages && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-accent">
            <ArrowRight size={13} />
            {book.currentPage ?? 0} → {next} · {progressPercent({ currentPage: next, totalPages: book.totalPages, status: null })}%
          </p>
        )}
      </form>

      <hr className="border-border" />

      <div className="flex flex-col gap-2.5">
        <p className="text-[13px] font-medium">Status</p>
        <div role="radiogroup" aria-label="Status" className="flex flex-col gap-0.5">
          {EDITABLE_STATUSES.map((status) => {
            const selected = book.status === status;
            const tone = TONE_CLASSES[STATUS_TONE[status]];
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={pending}
                onClick={() => !selected && save(book.currentPage ?? 0, status)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-[5px] px-2.5 py-[7px] text-left text-[13px] disabled:cursor-wait",
                  selected ? `${tone.bg} ${tone.fg} font-semibold` : "hover:bg-surface-muted",
                )}
              >
                <StatusDot tone={STATUS_TONE[status]} className="size-2" />
                <span className="flex-1">{status}</span>
                {selected && <Check size={14} />}
              </button>
            );
          })}
        </div>
        <p className="flex gap-2 rounded-[5px] bg-surface-muted p-2.5 text-xs text-text-secondary">
          <Info size={14} className="mt-px shrink-0 text-text-tertiary" />
          Status também muda sozinho: ao registrar progresso vira Lendo; ao chegar na última página, Concluído.
        </p>
      </div>
    </aside>
  );
}
