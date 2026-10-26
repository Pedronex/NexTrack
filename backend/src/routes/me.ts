import Elysia from "elysia";
import type { SupabaseClient } from "@supabase/supabase-js";
import z from "zod";
import { authPlugin } from "../auth/plugin";
import { ApiError } from "../lib/errors";
import type { RouteDeps } from "./deps";

export interface MeDeps extends RouteDeps {
	service: () => SupabaseClient;
	now: () => number;
}

const RECENT_LOGIN_MS = 15 * 60_000;

const patchBody = z.object({
	displayName: z.string().min(1).max(120).optional(),
	yearlyGoal: z.number().int().min(1).optional(),
	showMiniPlayer: z.boolean().optional(),
});

interface ProfileRow {
	user_id: string;
	display_name: string | null;
	yearly_goal: number;
	show_mini_player: boolean;
}

function toMe(
	userId: string,
	email: string | null,
	providers: string[],
	profile: ProfileRow | null,
) {
	return {
		id: userId,
		email,
		displayName: profile?.display_name ?? "",
		yearlyGoal: profile?.yearly_goal ?? 24,
		showMiniPlayer: profile?.show_mini_player ?? true,
		providers,
	};
}

async function getUserWithProviders(service: SupabaseClient, userId: string) {
	const { data, error } = await service.auth.admin.getUserById(userId);
	if (error || !data?.user) throw new ApiError(500, "internal_error", "Erro interno");
	const identities = (data.user.identities ?? []) as { provider?: string }[];
	return {
		email: data.user.email ?? null,
		providers: [...new Set(identities.map((i) => i.provider).filter(Boolean))] as string[],
		lastSignInAt: data.user.last_sign_in_at ?? null,
	};
}

export function meRoutes(deps: MeDeps) {
	const auth = deps.getKey ? authPlugin(deps.env, deps.getKey) : authPlugin(deps.env);
	return new Elysia({ prefix: "/me" }).use(auth).get("/", async ({ user }) => {
		const db = deps.db(user.token);
		const { data: profile } = (await db
			.from("profiles")
			.select("*")
			.eq("user_id", user.id)
			.maybeSingle()) as unknown as { data: ProfileRow | null };
		const info = await getUserWithProviders(deps.service(), user.id);
		return toMe(user.id, info.email ?? user.email, info.providers, profile);
	}).patch(
		"/",
		async ({ user, body }) => {
			const db = deps.db(user.token);
			const patch: Record<string, unknown> = {};
			if (body.displayName !== undefined) patch.display_name = body.displayName;
			if (body.yearlyGoal !== undefined) patch.yearly_goal = body.yearlyGoal;
			if (body.showMiniPlayer !== undefined) patch.show_mini_player = body.showMiniPlayer;
			const { data: profile, error } = (await db
				.from("profiles")
				.update(patch)
				.eq("user_id", user.id)
				.select()
				.maybeSingle()) as unknown as {
				data: ProfileRow | null;
				error: { code?: string; message?: string } | null;
			};
			if (error) throw new ApiError(500, "internal_error", "Erro interno");
			const info = await getUserWithProviders(deps.service(), user.id);
			return toMe(user.id, info.email ?? user.email, info.providers, profile);
		},
		{ body: patchBody },
	).delete("/", async ({ user, set }) => {
		const service = deps.service();
		const info = await getUserWithProviders(service, user.id);
		const last = info.lastSignInAt ? Date.parse(info.lastSignInAt) : NaN;
		if (!Number.isFinite(last) || deps.now() - last > RECENT_LOGIN_MS) {
			throw new ApiError(403, "recent_login_required", "Faça login novamente para excluir a conta");
		}
		const { error } = await service.auth.admin.deleteUser(user.id);
		if (error) throw new ApiError(500, "internal_error", "Erro interno");
		set.status = 204;
		return null;
	});
}
