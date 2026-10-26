import { isFullPage } from "@notionhq/client";
import Elysia from "elysia";
import { z } from "zod";
import { notionPlugin } from "../plugins/notion";
import { write } from "../plugins/props";
import { toSession } from "../utils/mappers";
import { applyProgress } from "../utils/progress";

const sessionFields = z.object({
	title: z.string().min(1),
	bookId: z.string().min(1).nullable(),
	date: z.iso.date().nullable(),
	startPage: z.number().int().min(0).nullable(),
	endPage: z.number().int().min(0).nullable(),
	pagesRead: z.number().int().min(0).nullable(),
	durationMin: z.number().min(0).nullable(),
	spotifyUrl: z.url().nullable(),
	notes: z.string().nullable(),
});

const createBody = sessionFields.partial().required({ title: true });
const updateBody = sessionFields.partial();

type SessionInput = Partial<z.infer<typeof sessionFields>>;

// Só envia ao Notion o que veio no body; null limpa o campo.
function toProperties(s: SessionInput) {
	const p: Record<string, unknown> = {};
	if (s.title !== undefined) p["Sessão"] = write.title(s.title);
	if (s.bookId !== undefined) p["Livro"] = write.relation(s.bookId ? [s.bookId] : []);
	if (s.date !== undefined) p["Data"] = write.date(s.date);
	if (s.startPage !== undefined) p["Página inicial"] = write.number(s.startPage);
	if (s.endPage !== undefined) p["Página final"] = write.number(s.endPage);
	if (s.durationMin !== undefined) p["Duração (min)"] = write.number(s.durationMin);
	if (s.spotifyUrl !== undefined) p["Spotify"] = write.url(s.spotifyUrl);
	if (s.notes !== undefined) p["Notas"] = write.text(s.notes);

	// Páginas lidas: valor explícito vence; senão deriva de início/fim quando ambos vêm.
	const pagesRead =
		s.pagesRead !== undefined
			? s.pagesRead
			: s.startPage != null && s.endPage != null
				? Math.max(0, s.endPage - s.startPage)
				: undefined;
	if (pagesRead !== undefined) p["Páginas lidas"] = write.number(pagesRead);
	return p as never;
}

const idParams = z.object({ id: z.string().min(1) });

export const sessionsRoutes = new Elysia({ prefix: "/sessions", tags: ["sessions"] })
	.use(notionPlugin)
	.get(
		"/",
		async ({ notion, notionIds, query }) => {
			const res = await notion.dataSources.query({
				data_source_id: notionIds.sessions,
				sorts: [{ property: "Data", direction: "descending" }],
				filter: query.bookId
					? { property: "Livro", relation: { contains: query.bookId } }
					: undefined,
				start_cursor: query.cursor,
				page_size: query.limit,
			});
			return {
				data: res.results.filter(isFullPage).map(toSession),
				nextCursor: res.next_cursor,
				hasMore: res.has_more,
			};
		},
		{
			query: z.object({
				bookId: z.string().optional(),
				cursor: z.string().optional(),
				limit: z.coerce.number().int().min(1).max(100).default(50),
			}),
		},
	)
	.get(
		"/:id",
		async ({ notion, params, status }) => {
			const page = await notion.pages.retrieve({ page_id: params.id });
			if (!isFullPage(page)) return status(404, { error: "Sessão não encontrada" });
			return toSession(page);
		},
		{ params: idParams },
	)
	.post(
		"/",
		async ({ notion, notionIds, body, set }) => {
			const page = await notion.pages.create({
				parent: { type: "data_source_id", data_source_id: notionIds.sessions },
				properties: toProperties(body),
			});
			set.status = 201;
			if (!isFullPage(page)) return { id: page.id };
			const session = toSession(page);

			// Registrar uma sessão avança a página atual e o status do livro.
			if (body.bookId && body.endPage != null) {
				const book = await applyProgress(notion, body.bookId, {
					page: body.endPage,
					date: body.date ?? undefined,
					onlyForward: true,
				});
				return { ...session, book };
			}
			return session;
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
			if (!isFullPage(page)) return status(404, { error: "Sessão não encontrada" });
			return toSession(page);
		},
		{ params: idParams, body: updateBody },
	)
	.delete(
		"/:id",
		async ({ notion, params }) => {
			await notion.pages.update({ page_id: params.id, in_trash: true });
			return { ok: true };
		},
		{ params: idParams },
	);
