import { isFullPage } from "@notionhq/client";
import Elysia from "elysia";
import { z } from "zod";
import { notionPlugin } from "../plugins/notion";
import { write } from "../plugins/props";
import { toBook } from "../utils/mappers";
import { applyProgress } from "../utils/progress";

const STATUS = ["Quero ler", "Lendo", "Pausado", "Concluído", "Abandonado"] as const;
const FORMAT = ["Físico", "Digital", "Audiobook", "E-Book"] as const;

const bookFields = z.object({
	title: z.string().min(1),
	author: z.string().nullable(),
	status: z.enum(STATUS).nullable(),
	format: z.enum(FORMAT).nullable(),
	currentPage: z.number().int().min(0).nullable(),
	totalPages: z.number().int().min(1).nullable(),
	startedAt: z.iso.date().nullable(),
	finishedAt: z.iso.date().nullable(),
	rating: z.number().min(0).max(5).nullable(),
	isbn: z.string().nullable(),
});

const createBody = bookFields.partial().required({ title: true });
const updateBody = bookFields.partial();

type BookInput = Partial<z.infer<typeof bookFields>>;

// Só envia ao Notion o que veio no body; null limpa o campo.
function toProperties(b: BookInput) {
	const p: Record<string, unknown> = {};
	if (b.title !== undefined) p["Livro"] = write.title(b.title);
	if (b.author !== undefined) p["Autor"] = write.text(b.author);
	if (b.status !== undefined) p["Status"] = write.select(b.status);
	if (b.format !== undefined) p["Formato"] = write.select(b.format);
	if (b.currentPage !== undefined) p["Página atual"] = write.number(b.currentPage);
	if (b.totalPages !== undefined) p["Total de páginas"] = write.number(b.totalPages);
	if (b.startedAt !== undefined) p["Data de início"] = write.date(b.startedAt);
	if (b.finishedAt !== undefined) p["Data de conclusão"] = write.date(b.finishedAt);
	if (b.rating !== undefined) p["Avaliação"] = write.number(b.rating);
	if (b.isbn !== undefined) p["ISBN"] = write.text(b.isbn);
	return p as never;
}

const idParams = z.object({ id: z.string().min(1) });

export const booksRoutes = new Elysia({ prefix: "/books", tags: ["books"] })
	.use(notionPlugin)
	.get(
		"/",
		async ({ notion, notionIds, query }) => {
			const res = await notion.dataSources.query({
				data_source_id: notionIds.books,
				sorts: [{ property: "Livro", direction: "ascending" }],
				filter: query.status
					? { property: "Status", select: { equals: query.status } }
					: undefined,
				start_cursor: query.cursor,
				page_size: query.limit,
			});
			return {
				data: res.results.filter(isFullPage).map(toBook),
				nextCursor: res.next_cursor,
				hasMore: res.has_more,
			};
		},
		{
			query: z.object({
				status: z.enum(STATUS).optional(),
				cursor: z.string().optional(),
				limit: z.coerce.number().int().min(1).max(100).default(50),
			}),
		},
	)
	.get(
		"/:id",
		async ({ notion, params, status }) => {
			const page = await notion.pages.retrieve({ page_id: params.id });
			if (!isFullPage(page)) return status(404, { error: "Livro não encontrado" });
			return toBook(page);
		},
		{ params: idParams },
	)
	.post(
		"/",
		async ({ notion, notionIds, body, set }) => {
			const page = await notion.pages.create({
				parent: { type: "data_source_id", data_source_id: notionIds.books },
				properties: toProperties(body),
			});
			set.status = 201;
			return isFullPage(page) ? toBook(page) : { id: page.id };
		},
		{ body: createBody },
	)
	.patch(
		"/:id",
		async ({ notion, params, body, status }) => {
			const page = await notion.pages.update({
				page_id: params.id,
				properties: toProperties(body),
			});
			if (!isFullPage(page)) return status(404, { error: "Livro não encontrado" });
			return toBook(page);
		},
		{ params: idParams, body: updateBody },
	)
	.patch(
		"/:id/progress",
		({ notion, params, body }) =>
			applyProgress(notion, params.id, {
				page: body.currentPage,
				status: body.status,
			}),
		{
			params: idParams,
			body: z.object({
				currentPage: z.number().int().min(0),
				status: z.enum(STATUS).optional(),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ notion, params }) => {
			await notion.pages.update({ page_id: params.id, in_trash: true });
			return { ok: true };
		},
		{ params: idParams },
	);
