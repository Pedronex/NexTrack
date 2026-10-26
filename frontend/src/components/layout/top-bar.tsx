import { TopBarActions } from "./top-bar-actions";

interface TopBarProps {
  eyebrow: string;
  title: string;
}

export function TopBar({ eyebrow, title }: TopBarProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-10 pt-[30px] pb-6">
      <div className="flex flex-col gap-1">
        <p className="text-[13px] text-text-tertiary">{eyebrow}</p>
        <h1 className="font-display text-[34px] leading-tight font-medium tracking-[-0.4px] text-text-primary">
          {title}
        </h1>
      </div>
      <TopBarActions />
    </header>
  );
}
