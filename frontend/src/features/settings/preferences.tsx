"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { type ReactNode, useSyncExternalStore, useTransition } from "react";
import { updateProfileAction } from "@/app/actions";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";

type Theme = "light" | "dark" | "system";

const THEME_KEY = "nextrack-theme";
const CHANGE_EVENT = "nextrack-preferences";

// Tema segue no navegador, lido como "store externa" para hidratar sem divergência.
function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Armazenamento indisponível (modo privado): a preferência vale só nesta página.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function useStored(key: string, fallback: string) {
  return useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );
}

function applyTheme(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  write(THEME_KEY, theme === "system" ? null : theme);
}

const Row = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => (
  <div className="flex items-center gap-3 border-b border-border px-6 py-4 last:border-b-0">
    <div className="flex flex-1 flex-col gap-px">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-text-secondary">{description}</p>
    </div>
    {children}
  </div>
);

export function Preferences({
  yearlyGoal,
  showMiniPlayer,
}: {
  yearlyGoal: number;
  showMiniPlayer: boolean;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const theme = useStored(THEME_KEY, "system") as Theme;

  const save = (patch: { yearlyGoal?: number; showMiniPlayer?: boolean }) =>
    startTransition(async () => {
      const res = await updateProfileAction(patch);
      if (!res.ok) {
        toast.show({ kind: "error", title: "Não foi possível salvar", description: res.message });
      }
    });

  return (
    <div className="flex flex-col rounded border border-border bg-surface">
      <Row title="Tema" description="Acompanha o sistema operacional por padrão">
        <Segmented
          label="Tema"
          value={theme}
          onChange={applyTheme}
          options={[
            { value: "light", label: "Claro", icon: <Sun size={14} /> },
            { value: "dark", label: "Escuro", icon: <Moon size={14} /> },
            { value: "system", label: "Sistema", icon: <Monitor size={14} /> },
          ]}
        />
      </Row>
      <Row title="Meta de leitura anual" description="Vale para sua conta, em todos os navegadores">
        <label className="flex h-9 w-[120px] items-center gap-1.5 rounded-[5px] border border-border-strong px-3 focus-within:border-accent">
          <input
            type="number"
            min={1}
            aria-label="Meta de leitura anual, em livros"
            defaultValue={yearlyGoal}
            disabled={pending}
            onBlur={(event) => {
              const value = Number(event.target.value);
              if (Number.isInteger(value) && value >= 1 && value !== yearlyGoal) save({ yearlyGoal: value });
              else event.target.value = String(yearlyGoal);
            }}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <span className="text-xs text-text-tertiary">livros</span>
        </label>
      </Row>
      <Row title="Mini player" description="Mostra o que está tocando na barra lateral">
        <Segmented
          label="Mini player"
          value={showMiniPlayer ? "on" : "off"}
          onChange={(value) => save({ showMiniPlayer: value === "on" })}
          options={[
            { value: "on", label: "Ligado" },
            { value: "off", label: "Desligado" },
          ]}
        />
      </Row>
      <Row title="Formato de data" description="Padrão brasileiro">
        <span className="text-[13px] font-medium text-text-secondary">DD/MM/AAAA</span>
      </Row>
    </div>
  );
}
