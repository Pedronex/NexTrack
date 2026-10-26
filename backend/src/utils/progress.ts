import { type Client, isFullPage } from "@notionhq/client";
import { write } from "../plugins/props";
import type { Book, Status } from "../types";
import { toBook } from "./mappers";

interface ProgressInput {
	/** Página atingida. */
	page: number;
	/** Status explícito; se ausente, é derivado da página. */
	status?: Status;
	/** Data (YYYY-MM-DD) usada em início/conclusão. Padrão: hoje. */
	date?: string;
	/** true = só avança a página atual, nunca recua (sessões de leitura). */
	onlyForward?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

function nextStatus(book: Book, page: number, explicit?: Status): Status | null {
	if (explicit) return explicit;
	if (book.totalPages && page >= book.totalPages) return "Concluído";
	if (book.status === null || book.status === "Quero ler" || book.status === "Pausado")
		return "Lendo";
	return book.status;
}

/** Atualiza página atual, status e datas do livro. Devolve o livro atualizado. */
export async function applyProgress(
	notion: Client,
	bookId: string,
	input: ProgressInput,
): Promise<Book> {
	const current = await notion.pages.retrieve({ page_id: bookId });
	if (!isFullPage(current)) throw new Error("Livro não encontrado");
	const book = toBook(current);

	const page = input.onlyForward
		? Math.max(book.currentPage ?? 0, input.page)
		: input.page;
	const status = nextStatus(book, page, input.status);
	const date = input.date ?? today();

	const props: Record<string, unknown> = {
		"Página atual": write.number(page),
	};
	if (status !== book.status) props["Status"] = write.select(status);
	if (!book.startedAt && (status === "Lendo" || status === "Concluído"))
		props["Data de início"] = write.date(date);
	if (status === "Concluído" && !book.finishedAt)
		props["Data de conclusão"] = write.date(date);

	const updated = await notion.pages.update({
		page_id: bookId,
		properties: props as never,
	});
	if (!isFullPage(updated)) throw new Error("Livro não encontrado");
	return toBook(updated);
}
