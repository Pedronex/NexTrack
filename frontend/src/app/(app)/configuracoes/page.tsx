import { ServerOff } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { Skeleton, StateMessage } from "@/components/ui/states";
import { getSpotifyStatus } from "@/lib/api/integrations";
import { getMe } from "@/lib/api/me";
import { AccountSection } from "@/features/settings/account-section";
import { DangerZone } from "@/features/settings/danger-zone";
import { Integrations } from "@/features/settings/integrations";
import { LoginMethods } from "@/features/settings/login-methods";
import { Preferences } from "@/features/settings/preferences";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <>
      <TopBar eyebrow="Conta, integrações e preferências" title="Configurações" />
      <div className="flex max-w-[840px] flex-col gap-8 px-4 sm:px-6 lg:px-10 pt-2 pb-14">
        <Suspense fallback={<Skeleton className="h-[300px]" />}>
          <SettingsSections />
        </Suspense>
      </div>
    </>
  );
}

async function SettingsSections() {
  const me = await getMe().catch(() => null);
  if (!me) {
    return (
      <StateMessage
        icon={ServerOff}
        tone="danger"
        title="Não foi possível carregar as configurações"
        description="A API NexTrack está fora do ar ou sem internet."
        className="rounded border border-border bg-surface"
      />
    );
  }
  const spotify = await getSpotifyStatus().catch(() => null);

  return (
    <>
      <AccountSection me={me} />
      <section className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-xl font-medium">Métodos de login</h2>
          <p className="text-[13px] text-text-secondary">Como você entra no NexTrack.</p>
        </div>
        <LoginMethods providers={me.providers} />
      </section>
      {spotify && <Integrations spotify={spotify} />}
      <section className="flex flex-col gap-3.5">
        <h2 className="font-display text-xl font-medium">Preferências</h2>
        <Preferences yearlyGoal={me.yearlyGoal} showMiniPlayer={me.showMiniPlayer} />
      </section>
      <DangerZone />
    </>
  );
}
