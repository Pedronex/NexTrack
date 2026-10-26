"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { type CsvCell, downloadCsv } from "@/lib/csv";

export function CompareToggle({ enabled, href, label }: { enabled: boolean; href: string; label: string }) {
  return (
    <Link href={href} role="switch" aria-checked={enabled} className="flex items-center gap-2 text-[13px] text-text-secondary">
      <span className={cn("flex h-[18px] w-8 items-center rounded-[5px] p-0.5", enabled ? "justify-end bg-ink" : "justify-start bg-border-strong")}>
        <span className="size-3.5 rounded-full bg-ink-fg" />
      </span>
      {label}
    </Link>
  );
}

export function CustomRange({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  return (
    <form
      className="flex items-center gap-2 pl-2 text-[13px]"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        router.push(`/relatorios?tipo=personalizado&de=${data.get("de")}&ate=${data.get("ate")}`);
      }}
    >
      <input type="date" name="de" defaultValue={from} required aria-label="De" className="h-8 rounded-[5px] border border-border-strong bg-surface px-2" />
      <span className="text-text-tertiary">até</span>
      <input type="date" name="ate" defaultValue={to} required aria-label="Até" className="h-8 rounded-[5px] border border-border-strong bg-surface px-2" />
      <Button type="submit" size="sm" variant="secondary">
        Aplicar
      </Button>
    </form>
  );
}

interface ExportMenuProps {
  header: string[];
  rows: CsvCell[][];
  filename: string;
}

export function ExportMenu({ header, rows, filename }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const item = "flex w-full cursor-pointer items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left hover:bg-surface-muted";

  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" size="sm" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Download size={14} />
        Exportar
      </Button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-10 mt-1 w-[260px] rounded-[5px] border border-border bg-surface p-1.5 shadow-lg">
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              downloadCsv(filename, header, rows);
              setOpen(false);
            }}
          >
            <FileSpreadsheet size={16} className="text-text-secondary" />
            <span className="flex flex-col gap-px">
              <span className="text-[13px] font-medium">CSV</span>
              <span className="text-[11px] text-text-tertiary">Sessões do período</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              window.print();
            }}
          >
            <FileText size={16} className="text-text-secondary" />
            <span className="flex flex-col gap-px">
              <span className="text-[13px] font-medium">PDF</span>
              <span className="text-[11px] text-text-tertiary">Imprimir ou salvar como PDF</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
