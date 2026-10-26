import type { Metadata } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { ModalProvider } from "@/components/modals/modal-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { getAllBooks } from "@/lib/api/books";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "NexTrack", template: "%s · NexTrack" },
  description: "Acompanhe suas leituras, sessões e progresso.",
};

// Aplica o tema salvo antes da primeira pintura (evita flash). "sistema" = sem atributo.
const THEME_SCRIPT = `try{var t=localStorage.getItem("nextrack-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Os formulários precisam da lista de livros; se a API cair, abrem vazios em vez de quebrar o app.
  const booksPromise = getAllBooks().catch(() => []);

  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${newsreader.variable} ${instrumentSans.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <ToastProvider>
          <ModalProvider booksPromise={booksPromise}>
            <div className="flex min-h-dvh">
              <Sidebar />
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </ModalProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
