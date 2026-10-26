export type CsvCell = string | number | null;

// Campos entre aspas, com aspas duplicadas: formato aceito por Excel e Notion.
const escape = (value: CsvCell) => `"${String(value ?? "").replaceAll('"', '""')}"`;

/** Baixa um CSV no navegador. O BOM faz o Excel reconhecer UTF-8 (acentos). */
export function downloadCsv(filename: string, header: string[], rows: CsvCell[][]) {
  const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}
