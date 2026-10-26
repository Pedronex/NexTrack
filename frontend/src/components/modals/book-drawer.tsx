"use client";

import { Book as BookIcon, CircleAlert, Headphones, Star, Tablet } from "lucide-react";
import { type ReactNode, use, useState, useTransition } from "react";
import { saveBookAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/components/ui/book-cover";
import { Drawer } from "@/components/ui/drawer";
import { Field, TextInput } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { StatusDot } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { FORMAT_LABEL, FORMATS, STATUSES, STATUS_TONE, TONE_CLASSES } from "@/lib/domain/books";
import type { Book, BookFormat, BookInput, Status } from "@/lib/types";
import { hasErrors, validateBook } from "@/lib/validation";

interface BookDrawerProps {
  bookId?: string;
  booksPromise: Promise<Book[]>;
  onClose: () => void;
}

interface FormState {
  title: string;
  author: string;
  status: Status;
  format: BookFormat;
  currentPage: string;
  totalPages: string;
  startedAt: string;
  finishedAt: string;
  rating: number;
  isbn: string;
}

const FORMAT_ICONS: Record<BookFormat, ReactNode> = {
  Físico: <BookIcon size={14} />,
  Digital: <Tablet size={14} />,
  "E-Book": <Tablet size={14} />,
  Audiobook: <Headphones size={14} />,
};

const toForm = (book?: Book): FormState => ({
  title: book?.title ?? "",
  author: book?.author ?? "",
  status: book?.status ?? "Quero ler",
  format: book?.format ?? "Físico",
  currentPage: String(book?.currentPage ?? 0),
  totalPages: book?.totalPages != null ? String(book.totalPages) : "",
  startedAt: book?.startedAt?.slice(0, 10) ?? "",
  finishedAt: book?.finishedAt?.slice(0, 10) ?? "",
  rating: book?.rating ?? 0,
  isbn: book?.isbn ?? "",
});

const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value));
const textOrNull = (value: string) => value.trim() || null;

function toInput(form: FormState): BookInput {
  return {
    title: form.title.trim(),
    author: textOrNull(form.author),
    status: form.status,
    format: form.format,
    currentPage: numberOrNull(form.currentPage),
    totalPages: numberOrNull(form.totalPages),
    startedAt: textOrNull(form.startedAt),
    finishedAt: textOrNull(form.finishedAt),
    rating: form.rating > 0 ? form.rating : null,
    isbn: textOrNull(form.isbn),
  };
}

export function BookDrawer({ bookId, booksPromise, onClose }: BookDrawerProps) {
  const books = use(booksPromise);
  const editing = books.find((b) => b.id === bookId);
  const toast = useToast();

  const [form, setForm] = useState(() => toForm(editing));
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const errors = validateBook(toInput(form));
  const visible = submitted ? errors : {};

  function submit() {
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setServerError(null);
    startTransition(async () => {
      const result = await saveBookAction(editing?.id ?? null, toInput(form));
      if (!result.ok) return setServerError(result.message);
      toast.show({
        kind: "success",
        title: editing ? "Livro atualizado" : "Livro criado",
        description: result.data.title,
      });
      onClose();
    });
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? "Editar livro" : "Novo livro"}
      subtitle={
        editing ? "As alterações são gravadas no Notion." : "Será criado na base Biblioteca do Notion."
      }
      footer={
        <>
          {(submitted && hasErrors(errors)) || serverError ? (
            <p className="flex items-center gap-1.5 text-xs text-danger" role="alert">
              <CircleAlert size={14} />
              {serverError ?? (errors.title ? "Preencha o título para salvar" : "Revise os campos destacados")}
            </p>
          ) : null}
          <span className="flex-1" />
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Salvando…" : editing ? "Salvar alterações" : "Salvar"}
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4 rounded-[5px] bg-surface-muted p-3.5">
        <BookCover title={form.title || "?"} size="md" className="h-[68px] w-12" />
        <div className="flex flex-col gap-0.5">
          <p className="text-[13px] font-medium">Capa gerada automaticamente</p>
          <p className="text-xs text-text-secondary">
            Iniciais do título + cor derivada. Muda ao editar o título.
          </p>
        </div>
      </div>

      <Field label="Título *" htmlFor="book-title" error={visible.title}>
        <TextInput
          id="book-title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ex.: Torto Arado"
          invalid={Boolean(visible.title)}
          autoFocus
        />
      </Field>

      <Field label="Autor" htmlFor="book-author">
        <TextInput
          id="book-author"
          value={form.author}
          onChange={(e) => set("author", e.target.value)}
          placeholder="Nome do autor"
        />
      </Field>

      <Field label="Status">
        <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-1.5">
          {STATUSES.map((status) => {
            const tone = TONE_CLASSES[STATUS_TONE[status]];
            const selected = form.status === status;
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => set("status", status)}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium",
                  selected ? `${tone.bg} ${tone.fg} ${tone.border}` : "border-border bg-surface text-text-secondary",
                )}
              >
                <StatusDot tone={STATUS_TONE[status]} />
                {status}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Formato">
        <Segmented
          label="Formato"
          fill
          value={form.format}
          onChange={(value) => set("format", value)}
          options={FORMATS.map((value) => ({ value, label: FORMAT_LABEL[value], icon: FORMAT_ICONS[value] }))}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Página atual" htmlFor="book-current" error={visible.currentPage} help="Deve ser ≤ total de páginas">
          <TextInput
            id="book-current"
            type="number"
            min={0}
            value={form.currentPage}
            onChange={(e) => set("currentPage", e.target.value)}
            invalid={Boolean(visible.currentPage)}
          />
        </Field>
        <Field label="Total de páginas" htmlFor="book-total" error={visible.totalPages} help="Mínimo 1">
          <TextInput
            id="book-total"
            type="number"
            min={1}
            value={form.totalPages}
            onChange={(e) => set("totalPages", e.target.value)}
            invalid={Boolean(visible.totalPages)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Data de início" htmlFor="book-start" help="Preenchida no 1º progresso">
          <TextInput
            id="book-start"
            type="date"
            value={form.startedAt}
            onChange={(e) => set("startedAt", e.target.value)}
          />
        </Field>
        <Field label="Data de conclusão" htmlFor="book-finish" error={visible.finishedAt} help="Preenchida ao concluir">
          <TextInput
            id="book-finish"
            type="date"
            value={form.finishedAt}
            onChange={(e) => set("finishedAt", e.target.value)}
            invalid={Boolean(visible.finishedAt)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Avaliação">
          <div className="flex h-10 items-center gap-2.5">
            <div className="flex gap-0.5" role="radiogroup" aria-label="Avaliação">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={form.rating === star}
                  aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
                  onClick={() => set("rating", form.rating === star ? 0 : star)}
                  className="cursor-pointer"
                >
                  <Star
                    size={22}
                    className={star <= form.rating ? "fill-paused-dot text-paused-dot" : "fill-border-strong text-border-strong"}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs text-text-tertiary">{form.rating} / 5</span>
          </div>
        </Field>
        <Field label="ISBN" htmlFor="book-isbn" help="Opcional">
          <TextInput
            id="book-isbn"
            value={form.isbn}
            onChange={(e) => set("isbn", e.target.value)}
            placeholder="978-…"
          />
        </Field>
      </div>
    </Drawer>
  );
}
