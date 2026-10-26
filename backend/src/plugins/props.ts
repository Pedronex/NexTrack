import type { PageObjectResponse } from "@notionhq/client";

type Prop = PageObjectResponse["properties"][string];
type PropOf<T extends Prop["type"]> = Extract<Prop, { type: T }>;

function get<T extends Prop["type"]>(
	page: PageObjectResponse,
	name: string,
	type: T,
): PropOf<T> {
	const p = page.properties[name];
	if (!p)
		throw new Error(`Propriedade "${name}" não existe na página ${page.id}`);
	if (p.type !== type)
		throw new Error(`"${name}" é ${p.type}, esperado ${type}`);
	return p as PropOf<T>;
}

export const read = {
	title: (pg: PageObjectResponse, n: string) =>
		get(pg, n, "title")
			.title.map((t) => t.plain_text)
			.join(""),
	text: (pg: PageObjectResponse, n: string) =>
		get(pg, n, "rich_text")
			.rich_text.map((t) => t.plain_text)
			.join("") || null,
	number: (pg: PageObjectResponse, n: string) => get(pg, n, "number").number,
	select: <T extends string>(pg: PageObjectResponse, n: string) =>
		(get(pg, n, "select").select?.name ?? null) as T | null,
	date: (pg: PageObjectResponse, n: string) =>
		get(pg, n, "date").date?.start ?? null,
	url: (pg: PageObjectResponse, n: string) => get(pg, n, "url").url,
	relationIds: (pg: PageObjectResponse, n: string) =>
		get(pg, n, "relation").relation.map((r) => r.id),
};

const richText = (v: string) => [{ type: "text" as const, text: { content: v } }];

export const write = {
	title: (v: string) => ({ title: richText(v) }),
	text: (v: string | null) => ({ rich_text: v === null ? [] : richText(v) }),
	number: (v: number | null) => ({ number: v }),
	select: (v: string | null) => ({ select: v === null ? null : { name: v } }),
	date: (v: string | null) => ({ date: v === null ? null : { start: v } }),
	url: (v: string | null) => ({ url: v }),
	relation: (ids: string[]) => ({ relation: ids.map((id) => ({ id })) }),
};
