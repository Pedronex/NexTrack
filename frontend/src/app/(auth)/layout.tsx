// Grupo de autenticação: layout sem sidebar, centralizado e responsivo.
// Sem `title` aqui: um título fixo no layout anularia o template "%s · NexTrack" das páginas.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">{children}</div>
    </div>
  );
}
