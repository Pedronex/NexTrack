"use client";

import {
  BookIcon,
  Calendar,
  CircleAlert,
  CircleCheck,
  Clock3,
  Link as LinkIcon,
  Lock,
  Music,
  TrendingUp,
} from "lucide-react";
import { type CSSProperties, use, useState, useTransition } from "react";
import { createSessionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { StateMessage } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { localToday } from "@/lib/dates";
import { formatDate, formatNumber } from "@/lib/format";
import { progressPercent } from "@/lib/domain/books";
import type { Book, SessionInput } from "@/lib/types";
import { useSpotifyPlayback } from "@/lib/use-spotify";
import { hasErrors, validateSession } from "@/lib/validation";
import { BookPicker } from "./book-picker";
import { useModals } from "./modal-context";

interface SessionDrawerProps {
  presetBookId?: string;
  booksPromise: Promise<Book[]>;
  onClose: () => void;
}

const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value));

/** Livros que ainda podem receber leitura. */
const isReadable = (book: Book) => book.status !== "Concluído" && book.status !== "Abandonado";

export function SessionDrawer({ presetBookId, booksPromise, onClose }: SessionDrawerProps) {
  const books = use(booksPromise);
  const toast = useToast();
  const modals = useModals();
  const spotify = useSpotifyPlayback();

  const available = books.filter((b) => isReadable(b) || b.id === presetBookId);
  const [bookId, setBookId] = useState(presetBookId ?? available[0]?.id ?? "");
  const book = books.find((b) => b.id === bookId);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => localToday());
  const [duration, setDuration] = useState("");
  const [startPage, setStartPage] = useState(String(book?.currentPage ?? 0));
  const [endPage, setEndPage] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pickBook(next: Book) {
    setBookId(next.id);
    setStartPage(String(next.currentPage ?? 0));
    setEndPage("");
  }

  const start = numberOrNull(startPage);
  const end = numberOrNull(endPage);
  const input: SessionInput = {
    title: title.trim() || `Sessão de ${formatDate(date)}`,
    bookId: bookId || null,
    date,
    startPage: start,
    endPage: end,
    durationMin: numberOrNull(duration),
    spotifyUrl: spotifyUrl.trim() || null,
    notes: notes.trim() || null,
  };
  const errors = validateSession(input, book);
  const visible = submitted ? errors : {};
  const pagesRead = start != null && end != null && end > start ? end - start : null;

  const total = book?.totalPages ?? null;
  const before = book ? progressPercent(book) : 0;
  const after = total && end != null && end > (book?.currentPage ?? 0) ? Math.min(100, Math.round((end / total) * 100)) : null;
  const finishes = total != null && end != null && end >= total;
  const pagesLeftBefore = total != null ? Math.max(0, total - (book?.currentPage ?? 0)) : null;

  function submit() {
    setSubmitted(true);
    if (hasErrors(errors)) return;
    setServerError(null);
    startTransition(async () => {
      const result = await createSessionAction(input, total);
      if (!result.ok) return setServerError(result.message);
      const updated = result.data.book;
      const done = updated?.status === "Concluído";
      toast.show(
        done
          ? { kind: "celebrate", title: "Livro concluído!", description: `${book?.title} → Concluído em ${formatDate(date)}.` }
          : {
              kind: "success",
              title: "Sessão registrada",
              description: updated ? `${updated.title} agora na pág. ${updated.currentPage} (${progressPercent(updated)}%).` : undefined,
            },
      );
      onClose();
    });
  }

  const nowPlaying = spotify.state.status === "playing" || spotify.state.status === "paused" ? spotify.state.playback.item : null;

  const body =
    available.length === 0 ? (
      <StateMessage
        icon={BookIcon}
        title="Nenhum livro disponível"
        description="Cadastre um livro antes de registrar uma sessão. Concluídos e abandonados ficam ocultos."
        actions={<Button onClick={() => modals.openBook()}>Novo livro</Button>}
      />
    ) : (
      <form
        id="session-form"
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
        }}
      >
        {serverError && (
          <div className="flex gap-2.5 rounded-[5px] bg-danger-soft p-3.5 text-danger" role="alert">
            <CircleAlert size={16} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <p className="text-[13px] font-semibold">A sessão não foi salva</p>
              <p className="text-xs">{serverError} Nada foi perdido — o formulário continua preenchido.</p>
            </div>
          </div>
        )}

        <Field label="Livro" error={visible.bookId}>
          <BookPicker books={available} selected={book} onSelect={pickBook} />
        </Field>

        <Field label="Nome da sessão" htmlFor="session-title" aside="Opcional">
          <TextInput
            id="session-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Maratona de domingo"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="session-date" error={visible.date}>
            <TextInput
              id="session-date"
              type="date"
              icon={<Calendar size={15} />}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              invalid={Boolean(visible.date)}
            />
          </Field>
          <Field label="Duração (min)" htmlFor="session-duration" error={visible.durationMin}>
            <TextInput
              id="session-duration"
              type="number"
              min={0}
              icon={<Clock3 size={15} />}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Página inicial" htmlFor="session-start" help="Página atual do livro" error={visible.startPage}>
            <TextInput
              id="session-start"
              type="number"
              min={0}
              value={startPage}
              onChange={(e) => setStartPage(e.target.value)}
              invalid={Boolean(visible.startPage)}
            />
          </Field>
          <Field label="Página final" htmlFor="session-end" help={total ? `Máx. ${total}` : undefined} error={visible.endPage}>
            <TextInput
              id="session-end"
              type="number"
              min={0}
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              invalid={Boolean(visible.endPage)}
            />
          </Field>
          <Field label="Páginas lidas" htmlFor="session-read" help="Calculado">
            <TextInput
              id="session-read"
              readOnly
              value={pagesRead ?? ""}
              trailing={<Lock size={15} />}
              tabIndex={-1}
            />
          </Field>
        </div>

        {after !== null && book && (
          <div className="flex flex-col gap-2.5 rounded-[5px] bg-accent-faint p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp size={15} className="text-accent" />O livro vai de {book.currentPage ?? 0} → {end} ({after}%)
            </p>
            <div
              className="relative h-2 overflow-hidden rounded-full bg-surface"
              style={{ "--before": `${before}%`, "--after": `${after}%` } as CSSProperties}
            >
              <div className="absolute inset-y-0 left-0 w-(--after) rounded-full bg-done-dot" />
              <div className="absolute inset-y-0 left-0 w-(--before) rounded-full bg-accent" />
            </div>
            <p className="text-xs text-text-secondary">
              {finishes
                ? `Faltavam ${formatNumber(pagesLeftBefore ?? 0)} páginas — esta sessão termina o livro.`
                : `Faltam ${formatNumber(Math.max(0, (total ?? 0) - (end ?? 0)))} páginas depois desta sessão.`}
            </p>
          </div>
        )}

        {finishes && (
          <div className="flex gap-2.5 rounded-[5px] border border-done-dot bg-done-bg p-3.5 text-done-fg">
            <CircleCheck size={16} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <p className="text-[13px] font-semibold">Isso vai marcar o livro como Concluído</p>
              <p className="text-xs">
                Status: {book?.status ?? "—"} → Concluído · Data de conclusão: {formatDate(date)}. Você poderá avaliar o
                livro em seguida.
              </p>
            </div>
          </div>
        )}

        <Field label="Música da sessão (Spotify)" htmlFor="session-spotify" aside="Opcional" error={visible.spotifyUrl}>
          <div className="flex gap-2">
            <TextInput
              id="session-spotify"
              className="flex-1"
              icon={<LinkIcon size={15} />}
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="https://open.spotify.com/track/…"
              invalid={Boolean(visible.spotifyUrl)}
            />
            <Button
              variant="secondary"
              className="h-10 border-spotify/40 bg-spotify/10"
              disabled={!nowPlaying}
              onClick={() => nowPlaying && setSpotifyUrl(nowPlaying.external_urls.spotify)}
            >
              <Music size={15} className="text-spotify" />
              Usar música atual
            </Button>
          </div>
          {nowPlaying && (
            <p className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="size-1.5 rounded-full bg-spotify" />
              Tocando agora: {nowPlaying.name} — {nowPlaying.artists.map((a) => a.name).join(", ")}
            </p>
          )}
        </Field>

        <Field label="Notas" htmlFor="session-notes" aside="Opcional">
          <TextArea id="session-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </form>
    );

  return (
    <Drawer
      open
      onClose={onClose}
      title="Registrar sessão"
      subtitle="A página atual do livro só avança — nunca recua."
      footer={
        <>
          <span className="text-xs text-text-tertiary">⌘ + Enter para salvar</span>
          <span className="flex-1" />
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="session-form" disabled={pending || available.length === 0}>
            {pending ? "Salvando…" : "Salvar sessão"}
          </Button>
        </>
      }
    >
      {body}
    </Drawer>
  );
}
