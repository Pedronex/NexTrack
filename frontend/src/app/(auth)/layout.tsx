import type { Metadata } from "next";

export const metadata: Metadata = { title: "NexTrack" };

// Grupo de autenticação: layout sem sidebar, centralizado e responsivo.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">{children}</div>
    </div>
  );
}
