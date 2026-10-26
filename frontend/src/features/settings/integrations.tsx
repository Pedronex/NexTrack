import { Laptop, Music, Smartphone, Speaker } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { IntegrationStatus } from "@/lib/api/integrations";
import type { SpotifyDevice } from "@/lib/types";
import { DisconnectSpotifyButton } from "./integration-actions";
import { ConnectSpotifyButton } from "./spotify-card";

function Pill({ tone, children }: { tone: "done" | "drop" | "want"; children: ReactNode }) {
  const classes = {
    done: "bg-done-bg text-done-fg",
    drop: "bg-drop-bg text-drop-fg",
    want: "bg-want-bg text-want-fg",
  }[tone];
  const dot = { done: "bg-done-dot", drop: "bg-drop-dot", want: "bg-want-dot" }[tone];
  return (
    <span className={cn("flex items-center gap-1.5 rounded-full py-[3px] pr-[9px] pl-2 text-xs font-medium", classes)}>
      <span className={cn("size-1.5 rounded-full", dot)} />
      {children}
    </span>
  );
}

function CardHead({ logo, title, pill, description, action }: { logo: ReactNode; title: string; pill: ReactNode; description: string; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-4 p-6">
      {logo}
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex items-center gap-2.5">
          <h3 className="font-display text-xl font-medium">{title}</h3>
          {pill}
        </div>
        <p className="text-[13px] text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}

const DEVICE_ICONS = { Computer: Laptop, Smartphone, Speaker } as const;

function Device({ device }: { device: SpotifyDevice }) {
  const Icon = DEVICE_ICONS[device.type as keyof typeof DEVICE_ICONS] ?? Speaker;
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-[5px] border p-3",
        device.is_active ? "border-spotify bg-spotify/10" : "border-border",
      )}
    >
      <Icon size={18} className={device.is_active ? "text-spotify" : "text-text-secondary"} />
      <div className="flex flex-col gap-px">
        <p className="text-[13px] font-medium">{device.name}</p>
        <p className={cn("text-[11px]", device.is_active ? "text-spotify" : "text-text-tertiary")}>
          {device.is_active ? "Tocando agora" : "Disponível"}
        </p>
      </div>
    </li>
  );
}

interface IntegrationsProps {
  spotify: IntegrationStatus["spotify"];
}

export function Integrations({ spotify }: IntegrationsProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-xl font-medium">Integrações</h2>
        <p className="text-[13px] text-text-secondary">Conecte o Spotify para ver o que está tocando.</p>
      </div>

      <section className="flex flex-col rounded border border-border bg-surface">
        <CardHead
          logo={
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[5px] bg-spotify text-white">
              <Music size={22} />
            </span>
          }
          title="Spotify"
          pill={
            spotify.status === "connected" ? (
              <Pill tone="done">Conectado</Pill>
            ) : spotify.status === "expired" ? (
              <Pill tone="drop">Sessão expirada</Pill>
            ) : (
              <Pill tone="want">Desconectado</Pill>
            )
          }
          description={
            spotify.connected
              ? "Mostra o que está tocando, controla a reprodução e preenche o link da música nas sessões."
              : spotify.status === "expired"
                ? "A autorização expirou. Reconecte para continuar vendo o que está tocando."
                : "Conecte para ver o que está tocando e anexar músicas às sessões."
          }
          action={spotify.connected ? <DisconnectSpotifyButton /> : undefined}
        />
        {spotify.connected ? (
          <div className="flex flex-col gap-2.5 border-t border-border px-6 pt-4 pb-5">
            {(spotify.name || spotify.product) && (
              <p className="text-[13px] text-text-secondary">
                {spotify.name}
                {spotify.name && spotify.product ? " · " : ""}
                {spotify.product ? `Plano ${spotify.product}` : ""}
              </p>
            )}
            <p className="text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">Dispositivos</p>
            {spotify.devices.length === 0 ? (
              <p className="text-[13px] text-text-secondary">Nenhum dispositivo disponível. Abra o Spotify em algum aparelho.</p>
            ) : (
              <ul className="grid gap-2.5 sm:grid-cols-3">
                {spotify.devices.map((device) => (
                  <Device key={device.id} device={device} />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 px-6 pb-6">
            <ConnectSpotifyButton
              label={spotify.status === "expired" ? "Reconectar com Spotify" : "Conectar com Spotify"}
            />
            <span className="text-xs text-text-tertiary">Você será redirecionado para autorizar o acesso.</span>
          </div>
        )}
      </section>
    </div>
  );
}
