import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";

// A página é client component; os metadados ficam no layout do segmento.
export const metadata: Metadata = { title: "Esqueci minha senha", robots: NO_INDEX };

export default function ForgotLayout({ children }: LayoutProps<"/esqueci-senha">) {
  return children;
}
