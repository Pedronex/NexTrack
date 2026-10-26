import "server-only";
import { requireUser } from "@/lib/session";
import { api } from "./client";

export interface Me {
  id: string;
  email: string | null;
  displayName: string;
  yearlyGoal: number;
  showMiniPlayer: boolean;
  providers: string[];
}

export async function getMe(): Promise<Me> {
  const { accessToken } = await requireUser();
  return api<Me>("/me", { token: accessToken });
}

export async function updateMe(input: {
  displayName?: string;
  yearlyGoal?: number;
  showMiniPlayer?: boolean;
}): Promise<Me> {
  const { accessToken } = await requireUser();
  return api<Me>("/me", { method: "PATCH", body: JSON.stringify(input), token: accessToken });
}

export async function deleteMe(): Promise<void> {
  const { accessToken } = await requireUser();
  await api<unknown>("/me", { method: "DELETE", token: accessToken });
}
