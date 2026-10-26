"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { type CsvCell, downloadCsv } from "@/lib/csv";

interface ExportCsvButtonProps {
  filename: string;
  header: string[];
  rows: CsvCell[][];
  label?: string;
  className?: string;
}

export function ExportCsvButton({ filename, header, rows, label = "Exportar CSV", className }: ExportCsvButtonProps) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(filename, header, rows)}
      className={cn("flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary", className)}
    >
      <Download size={14} />
      {label}
    </button>
  );
}
