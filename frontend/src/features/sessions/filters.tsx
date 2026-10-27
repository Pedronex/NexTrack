"use client";

import { ChevronDown, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type SessionsParams, sessionsHref } from "./params";

interface Option {
  value: string;
  label: string;
}

interface SessionsFiltersProps {
  params: SessionsParams;
  currentMonth: string;
  books: Option[];
  months: Option[];
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (v: string) => void }) {
  const current = options.find((o) => o.value === value)?.label ?? options[0]?.label;
  return (
    <label className="relative flex h-9 cursor-pointer items-center gap-1.5 rounded-[5px] border border-border-strong bg-surface pr-2.5 pl-3 text-[13px] focus-within:border-accent">
      <span className="text-text-secondary">{label}:</span>
      <span className="max-w-[140px] truncate sm:max-w-[200px] font-medium">{current}</span>
      <ChevronDown size={14} className="text-text-tertiary" />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SessionsFilters({ params, currentMonth, books, months }: SessionsFiltersProps) {
  const router = useRouter();
  const go = (patch: Partial<SessionsParams>) => router.push(sessionsHref(params, currentMonth, patch));

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <form
        role="search"
        className="flex h-9 w-full items-center sm:w-[280px] gap-2 rounded-[5px] border border-border-strong bg-surface px-2.5 focus-within:border-accent"
        onSubmit={(event) => {
          event.preventDefault();
          go({ q: String(new FormData(event.currentTarget).get("q") ?? "").trim() || undefined });
        }}
      >
        <Search size={15} className="shrink-0 text-text-tertiary" />
        <input
          key={params.q ?? ""}
          name="q"
          type="search"
          defaultValue={params.q}
          aria-label="Buscar nas notas e nomes"
          placeholder="Buscar nas notas e nomes"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-tertiary"
        />
      </form>
      <Select
        label="Livro"
        value={params.bookId ?? ""}
        options={[{ value: "", label: "Todos" }, ...books]}
        onChange={(value) => go({ bookId: value || undefined })}
      />
      <Select
        label="Período"
        value={params.month}
        options={[...months, { value: "todos", label: "Todos os períodos" }]}
        onChange={(value) => go({ month: value })}
      />
    </div>
  );
}
