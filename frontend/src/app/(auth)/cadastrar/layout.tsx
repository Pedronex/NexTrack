import type { Metadata } from "next";
import { publicPage } from "@/lib/seo";

// A página é client component; os metadados ficam no layout do segmento.
export const metadata: Metadata = publicPage({
  title: "Criar conta",
  description: "Crie sua conta grátis no NexTrack: biblioteca, sessões de leitura, meta anual e Spotify num só lugar.",
  path: "/cadastrar",
});

export default function SignUpLayout({ children }: LayoutProps<"/cadastrar">) {
  return children;
}
