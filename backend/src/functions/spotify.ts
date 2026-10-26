import Elysia from "elysia";
import { z } from "zod";
import {
	buildAuthorizeUrl,
	completeLogin,
	disconnect,
	isConnected,
	spotifyFetch,
} from "../plugins/spotify";

const deviceQuery = z.object({ deviceId: z.string().optional() });
const withDevice = (deviceId?: string) =>
	deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";

export const spotifyRoutes = new Elysia({
	prefix: "/spotify",
	tags: ["spotify"],
})
	.get("/login", ({ redirect }) => redirect(buildAuthorizeUrl()))
	.get(
		"/callback",
		async ({ query, status }) => {
			if (query.error)
				return status(400, { error: `Spotify: ${query.error}` });
			if (!query.code || !query.state)
				return status(400, { error: "code/state ausentes" });
			await completeLogin(query.code, query.state);
			return { connected: true };
		},
		{
			query: z.object({
				code: z.string().optional(),
				state: z.string().optional(),
				error: z.string().optional(),
			}),
		},
	)
	.get("/status", () => ({ connected: isConnected() }))
	.delete("/connection", () => {
		disconnect();
		return { ok: true };
	})
	.get("/player", async () => (await spotifyFetch("/me/player")) ?? { active: false })
	.get(
		"/currently-playing",
		async () =>
			(await spotifyFetch("/me/player/currently-playing")) ?? { active: false },
	)
	.get("/devices", () => spotifyFetch("/me/player/devices"))
	.put(
		"/play",
		async ({ body, query }) => {
			await spotifyFetch(`/me/player/play${withDevice(query.deviceId)}`, {
				method: "PUT",
				body: body
					? JSON.stringify({ context_uri: body.contextUri, uris: body.uris })
					: undefined,
			});
			return { ok: true };
		},
		{
			query: deviceQuery,
			body: z
				.object({
					contextUri: z.string().optional(),
					uris: z.array(z.string()).optional(),
				})
				.optional(),
		},
	)
	.put(
		"/pause",
		async ({ query }) => {
			await spotifyFetch(`/me/player/pause${withDevice(query.deviceId)}`, {
				method: "PUT",
			});
			return { ok: true };
		},
		{ query: deviceQuery },
	)
	.post(
		"/next",
		async ({ query }) => {
			await spotifyFetch(`/me/player/next${withDevice(query.deviceId)}`, {
				method: "POST",
			});
			return { ok: true };
		},
		{ query: deviceQuery },
	)
	.post(
		"/previous",
		async ({ query }) => {
			await spotifyFetch(`/me/player/previous${withDevice(query.deviceId)}`, {
				method: "POST",
			});
			return { ok: true };
		},
		{ query: deviceQuery },
	);
