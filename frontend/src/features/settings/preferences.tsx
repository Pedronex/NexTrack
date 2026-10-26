"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";
import { Segmented } from "@/components/ui/segmented";

type Theme = "light" | "dark" | "system";

const THEME_KEY = "nextrack-theme";
const GOAL_KEY = "nextrack-yearly-goal";
const DEFAULT_GOAL = 24;
const CHANGE_EVENT = "nextrack-preferences";

// Preferências locais ao navegador, lidas como "store externa" para hidratar sem divergência.
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

export function Preferences() {
  const theme = useStored(THEME_KEY, "system") as Theme;
  const goal = useStored(GOAL_KEY, String(DEFAULT_GOAL));

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
      <Row title="Meta de leitura anual" description="Guardada neste navegador">
        <label className="flex h-9 w-[120px] items-center gap-1.5 rounded-[5px] border border-border-strong px-3 focus-within:border-accent">
          <input
            type="number"
            min={1}
            aria-label="Meta de leitura anual, em livros"
            value={goal}
            onChange={(event) => write(GOAL_KEY, event.target.value || null)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <span className="text-xs text-text-tertiary">livros</span>
        </label>
      </Row>
      <Row title="Formato de data" description="Padrão brasileiro">
        <span className="text-[13px] font-medium text-text-secondary">DD/MM/AAAA</span>
      </Row>
    </div>
  );
}
