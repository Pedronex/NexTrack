import Link from "next/link";
import { Suspense } from "react";
import { MiniPlayer } from "./mini-player";
import { NavLinks, NavList } from "./nav-links";
import { UserMenu } from "./user-menu";
import { getMe } from "@/lib/api/me";

export async function Sidebar() {
  // Sem perfil (API fora), a sidebar abre sem o bloco de usuário.
  const me = await getMe().catch(() => null);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[72px] shrink-0 flex-col border-r border-border bg-surface px-3 pt-[22px] pb-4 md:flex lg:w-[248px] lg:px-4">
      <Link
        href="/"
        aria-label="NexTrack"
        className="px-2.5 pb-7 text-center font-display text-2xl tracking-[-0.2px] text-text-primary lg:text-left"
      >
        <span className="lg:hidden">N</span>
        <span className="hidden lg:inline">NexTrack</span>
      </Link>
      <Suspense fallback={<NavList />}>
        <NavLinks />
      </Suspense>
      <div className="flex-1" />
      {me?.showMiniPlayer !== false && (
        <div className="hidden lg:block">
          <MiniPlayer />
        </div>
      )}
      {me && (
        <div className="mt-2 border-t border-border pt-2">
          <UserMenu me={me} />
        </div>
      )}
    </aside>
  );
}
