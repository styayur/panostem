import React from "react";
import { cn } from "../lib/cn";
import { attempt } from "../stores/noticeStore";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold",
        tone === "accent" &&
          "border-accent/40 bg-accent/10 text-accent dark:text-accent",
        tone === "muted" &&
          "border-edge-light bg-canvas-light text-muted dark:border-edge-dark dark:bg-canvas-dark dark:text-muted",
        tone === "neutral" &&
          "border-edge-light bg-panel text-muted dark:border-edge-dark dark:bg-surface-dark dark:text-ink",
        className
      )}
    >
      {children}
    </span>
  );
}

export function IconButton({
  title,
  onClick,
  children,
  disabled,
  active,
}: {
  title: string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(e) => { void attempt(async () => onClick?.(e)); }}
      className={cn(
        "rounded-md p-1.5 text-muted transition-colors hover:bg-subtle/70 hover:text-ink disabled:opacity-100 dark:text-muted dark:hover:bg-subtle/50 dark:hover:text-ink",
        active && "bg-subtle/80 text-ink dark:bg-subtle/60 dark:text-ink"
      )}
    >
      {children}
    </button>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-edge-light bg-panel px-1 py-0.5 font-mono text-[11px] text-muted dark:border-edge-dark dark:bg-surface-dark dark:text-muted">
      {children}
    </kbd>
  );
}
