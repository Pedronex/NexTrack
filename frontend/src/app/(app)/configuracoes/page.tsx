import { ServerOff } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { Skeleton, StateMessage } from "@/components/ui/states";
import { getAllBooks } from "@/lib/api/books";
import { checkNotion, getSpotifyStatus } from "@/lib/api/integrations";
import { getAllSessions } from "@/lib/api/sessions";
import { Integrations } from "@/features/settings/integrations";
import { Preferences } from "@/features/settings/preferences";

export const metadata: Metadata = { title: "Configurações" };

export default function SettingsPage() {
  return (
    <>
      <TopBar eyebrow="Integrações e preferências" title="Configurações" />
      <div className="flex max-w-[840px] flex-col gap-8 px-10 pt-2 pb-14">
        <Suspense fallback={<Skeleton className="h-[420px]" />}>
          <IntegrationsSection />
        </Suspense>
        <section className="flex flex-col gap-3.5">
          <h2 className="font-display text-xl font-medium">Preferências</h2>
          <Preferences />
        </section>
      </div>
    </>
  );
}

async function loadIntegrations() {
  try {
    const [notion, spotify, books, sessions] = await Promise.all([
      checkNotion(),
      getSpotifyStatus(),
      getAllBooks().catch(() => []),
      getAllSessions().catch(() => []),
    ]);
    return { status: { notion, spotify }, booksCount: books.length, sessionsCount: sessions.length };
  } catch {
    return null;
  }
}

async function IntegrationsSection() {
  const integrations = await loadIntegrations();
  if (!integrations) {
    return (
      <StateMessage
        icon={ServerOff}
        tone="danger"
        title="Não foi possível verificar as integrações"
        description="A API NexTrack está fora do ar ou sem internet."
        className="rounded border border-border bg-surface"
      />
    );
  }
  return <Integrations {...integrations} />;
}
