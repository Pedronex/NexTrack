"use client";

import {
  BookOpenCheck,
  ChartColumn,
  LayoutDashboard,
  LibraryBig,
  type LucideIcon,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/biblioteca", label: "Biblioteca", icon: LibraryBig },
  { href: "/sessoes", label: "Sessões", icon: BookOpenCheck },
  { href: "/relatorios", label: "Relatórios", icon: ChartColumn },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

/** Lista de navegação; sem `pathname` (fallback de Suspense) nenhum item fica ativo. */
export function NavList({ pathname = "" }: { pathname?: string }) {
  return (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-[5px] px-2.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-surface-sunken text-text-primary"
                : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
            )}
          >
            <Icon size={18} className={active ? "text-text-primary" : "text-text-secondary"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavLinks() {
  return <NavList pathname={usePathname()} />;
}
