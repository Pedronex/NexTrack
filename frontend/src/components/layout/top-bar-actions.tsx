"use client";

import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useModals } from "@/components/modals/modal-context";

export function TopBarActions() {
  const router = useRouter();
  const modals = useModals();

  return (
    <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
      <form
        role="search"
        className="flex h-9 w-full items-center sm:w-[220px] gap-2 rounded-md border border-border bg-surface px-2.5 focus-within:border-accent"
        onSubmit={(event) => {
          event.preventDefault();
          const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
          router.push(query ? `/biblioteca?q=${encodeURIComponent(query)}` : "/biblioteca");
        }}
      >
        <Search size={15} className="shrink-0 text-text-tertiary" />
        <input
          name="q"
          type="search"
          aria-label="Buscar livro ou autor"
          placeholder="Buscar livro ou autor…"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-tertiary"
        />
      </form>
      <Button variant="secondary" onClick={() => modals.openBook()}>
        <Plus size={16} />
        Novo livro
      </Button>
      <Button onClick={() => modals.openSession()}>
        <Plus size={16} />
        Registrar sessão
      </Button>
    </div>
  );
}
