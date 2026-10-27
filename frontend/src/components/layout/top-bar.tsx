import { TopBarActions } from "./top-bar-actions";

interface TopBarProps {
  eyebrow: string;
  title: string;
}

export function TopBar({ eyebrow, title }: TopBarProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 px-4 sm:px-6 lg:px-10 pt-[30px] pb-6">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[13px] text-text-tertiary">{eyebrow}</p>
        <h1 className="font-display text-[28px] leading-tight sm:text-[34px] font-medium tracking-[-0.4px] text-text-primary">
          {title}
        </h1>
      </div>
      <TopBarActions />
    </header>
  );
}
