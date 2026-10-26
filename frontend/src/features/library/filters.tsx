"use client";

import { ChevronDown, LayoutGrid, List, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { BOOK_ORDERS, type BookOrder, FORMATS, FORMAT_LABEL } from "@/lib/domain/books";
import type { BookFormat } from "@/lib/types";
import { type LibraryParams, libraryHref } from "./params";

interface SelectFilterProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SelectFilter({ label, value, options, onChange }: SelectFilterProps) {
  const current = options.find((o) => o.value === value)?.label ?? options[0].label;
  return (
    <label className="relative flex h-9 cursor-pointer items-center gap-1.5 rounded-[5px] border border-border-strong bg-surface pr-2.5 pl-3 text-[13px] focus-within:border-accent">
      <span className="text-text-secondary">{label}:</span>
      <span className="font-medium">{current}</span>
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

interface LibraryFiltersProps {
  params: LibraryParams;
  shown: number;
  total: number;
}

export function LibraryFilters({ params, shown, total }: LibraryFiltersProps) {
  const router = useRouter();
  const go = (patch: Partial<LibraryParams>) => router.push(libraryHref(params, patch));

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <form
        role="search"
        className="flex h-9 w-80 items-center gap-2 rounded-[5px] border border-border-strong bg-surface px-2.5 focus-within:border-accent"
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
          aria-label="Buscar por título ou autor"
          placeholder="Buscar por título ou autor"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-tertiary"
        />
      </form>
      <SelectFilter
        label="Formato"
        value={params.format ?? ""}
        options={[
          { value: "", label: "Todos" },
          ...FORMATS.map((format) => ({ value: format, label: FORMAT_LABEL[format] })),
        ]}
        onChange={(value) => go({ format: (value || undefined) as BookFormat | undefined })}
      />
      <SelectFilter
        label="Ordenar"
        value={params.order}
        options={Object.entries(BOOK_ORDERS).map(([value, label]) => ({ value, label }))}
        onChange={(value) => go({ order: value as BookOrder })}
      />
      <span className="flex-1" />
      <span className="text-[13px] text-text-tertiary">
        Mostrando {shown} de {total}
      </span>
      <div className="flex gap-0.5 rounded-[5px] bg-surface-muted p-[3px]">
        {(
          [
            { view: "grade", label: "Grade", icon: LayoutGrid },
            { view: "tabela", label: "Tabela", icon: List },
          ] as const
        ).map(({ view, label, icon: Icon }) => (
          <Link
            key={view}
            href={libraryHref(params, { view, page: params.page })}
            aria-current={params.view === view ? "true" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
              params.view === view ? "bg-surface text-text-primary" : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
