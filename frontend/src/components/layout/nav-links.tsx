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
            aria-label={label}
            title={label}
            className={cn(
              "flex items-center justify-center gap-2.5 rounded-[5px] px-2.5 py-2 text-sm font-medium transition-colors lg:justify-start",
              active
                ? "bg-surface-sunken text-text-primary"
                : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
            )}
          >
            <Icon size={18} className={active ? "text-text-primary" : "text-text-secondary"} />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const TAB_LABELS: Record<string, string> = {
  "/": "Início",
  "/biblioteca": "Biblioteca",
  "/sessoes": "Sessões",
  "/relatorios": "Relatórios",
  "/configuracoes": "Ajustes",
};

/** Barra de abas flutuante do celular (abaixo de `md`, onde a sidebar não existe). */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-[420px] items-center justify-between glass rounded-full p-1.5 md:hidden"
    >
      {ITEMS.map(({ href, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-1.5 text-[11px] font-medium transition-colors",
              active ? "bg-(--glass-active) text-text-primary shadow-sm" : "text-text-secondary",
            )}
          >
            <Icon size={20} />
            <span className="max-w-full truncate">{TAB_LABELS[href]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function NavLinks() {
  return <NavList pathname={usePathname()} />;
}
