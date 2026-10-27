import type { Metadata } from "next";
import { connection } from "next/server";
import { ModalProvider } from "@/components/modals/modal-provider";
import { MobileNav } from "@/components/layout/nav-links";
import { Sidebar } from "@/components/layout/sidebar";
import { getAllBooks } from "@/lib/api/books";
import { NO_INDEX } from "@/lib/seo";

// Área logada: nada aqui entra no índice dos buscadores.
export const metadata: Metadata = { robots: NO_INDEX };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Rotas autenticadas: resolve em tempo de requisição (nunca pré-renderiza sem sessão).
  await connection();
  // Os formulários precisam da lista de livros; se a API cair, abrem vazios em vez de quebrar o app.
  const booksPromise = getAllBooks().catch(() => []);

  return (
    <ModalProvider booksPromise={booksPromise}>
      <div className="flex min-h-dvh">
        <Sidebar />
        <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
        <MobileNav />
      </div>
    </ModalProvider>
  );
}
