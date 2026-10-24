import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, LayoutPanelTop, Star } from "lucide-react";
import type { SearchResult } from "../lib/types";
import { useSearchStore } from "../stores/searchStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useT, typeLabelKey } from "../lib/i18n";
import { useTranslatedText } from "../lib/translate/useTranslatedText";
import * as cmd from "../lib/commands";
import { cn } from "../lib/cn";
import { Badge } from "./ui";
import { attempt } from "../stores/noticeStore";

export const RESULT_ROW_HEIGHT = 112;

const ResultRow = memo(function ResultRow({
  result,
  index,
  selected,
  onSelect,
}: {
  result: SearchResult;
  index: number;
  selected: boolean;
  onSelect: (index: number) => void;
}) {
  const t = useT();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const isFav = useSearchStore((s) => s.favoriteIds.has(result.id));
  const toggleFavorite = useSearchStore((s) => s.toggleFavorite);
  const toggleWorkspace = useWorkspaceStore((s) => s.toggle);
  const inWorkspace = useWorkspaceStore((s) => s.selected.some((r) => r.id === result.id));
  const workspaceFull = useWorkspaceStore((s) => s.selected.length >= 4);

  const translateOn = useSettingsStore((s) => s.settings.translate_results);
  const target = useSettingsStore((s) => s.settings.translate_target);
  const titleT = useTranslatedText(result.title, translateOn, target);
  const descT = useTranslatedText(result.description, translateOn, target);

  const title = titleT?.text ?? result.title;
  const description = descT?.text ?? result.description;
  const translated = Boolean(titleT && titleT.text !== result.title);

  const openWindow = () => attempt(() => cmd.openWindow(result.url, `${result.title} — ${result.source_name}`));

  return (
    <div
      ref={rowRef}
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(index)}
      onDoubleClick={(e) => { if (!(e.target as Element).closest("button")) void openWindow(); }}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          openWindow();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onSelect(index);
        setMenu({ x: e.clientX, y: e.clientY });
      }}
      className={cn(
        "result-row group cursor-default border-b border-edge-light/70 px-3 py-1.5 transition-colors dark:border-edge-dark/70",
        selected
          ? "sve-selected bg-accent/5 dark:bg-accent/10"
          : "hover:bg-subtle/70 dark:hover:bg-subtle/50"
      )}
      style={{ height: RESULT_ROW_HEIGHT }}
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 truncate text-[12px] font-semibold text-muted dark:text-muted">
          {result.source_name}
        </span>
        <Badge tone="muted">{t(typeLabelKey(result.result_type))}</Badge>
        {result.explanation?.matched.some(m=>m.tier==="exploratory") && <Badge tone="muted">{t("resource.related")}</Badge>}
        {translated && <Badge tone="accent">{t("common.translated")}</Badge>}
        <button
          type="button"
          title={isFav ? t("row.unfavorite") : t("row.favorite")}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(result);
          }}
          className={cn(
            "ml-auto rounded p-1 transition-colors",
            isFav
              ? "text-warning"
              : "text-muted hover:text-warning dark:text-muted"
          )}
        >
          <Star className="h-3.5 w-3.5" fill={isFav ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          title={t(inWorkspace ? "row.removeWorkspace" : workspaceFull ? "workspace.limit" : "row.workspace")}
          aria-pressed={inWorkspace}
          disabled={!inWorkspace && workspaceFull}
          onClick={(e) => {
            e.stopPropagation();
            toggleWorkspace(result);
          }}
          className={cn("rounded p-1 text-muted hover:text-accent disabled:opacity-100", inWorkspace && "bg-accent/15 text-accent")}
        >
          <LayoutPanelTop className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title={t("row.openWindow")}
          onClick={(e) => {
            e.stopPropagation();
            openWindow();
          }}
          className="rounded p-1 text-muted hover:text-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        title={translated ? result.title : undefined}
        className="result-title mt-0.5 line-clamp-2 text-[14px] font-medium leading-snug text-ink dark:text-ink"
      >
        {title}
      </div>
      {description && (
        <div
          title={translated ? result.description ?? undefined : undefined}
          className="line-clamp-1 text-[12px] text-muted dark:text-muted"
        >
          {description}
        </div>
      )}
      {result.tags.length > 0 && (
        <div className="result-tags mt-0.5 flex items-center gap-1 overflow-hidden text-[11px] text-muted dark:text-muted">
          {result.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="truncate">
              {tag}
            </span>
          ))}
        </div>
      )}

      {menu && createPortal(
        <ResultMenu x={menu.x} y={menu.y} result={result} onClose={() => setMenu(null)} />
      , document.body)}
    </div>
  );
});

function ResultMenu({
  x,
  y,
  result,
  onClose,
}: {
  x: number;
  y: number;
  result: SearchResult;
  onClose: () => void;
}) {
  const t = useT();
  const toggleFavorite = useSearchStore((s) => s.toggleFavorite);
  const isFav = useSearchStore((s) => s.favoriteIds.has(result.id));
  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const items: Array<{ label: string; run: () => unknown }> = [
    {
      label: t("ctx.open"),
      run: () => cmd.openWindow(result.url, `${result.title} — ${result.source_name}`),
    },
    {
      label: t("ctx.openWindow"),
      run: () => cmd.openWindow(result.url, `${result.title} — ${result.source_name}`),
    },
    { label: t("ctx.openBrowser"), run: () => cmd.openExternal(result.url) },
    { label: t("ctx.copyUrl"), run: () => cmd.copyUrl(result.url) },
    {
      label: isFav ? t("ctx.unfavorite") : t("ctx.favorite"),
      run: () => toggleFavorite(result),
    },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        role="menu"
        className="fixed z-50 min-w-[190px] rounded-lg border border-edge-light bg-panel py-1 shadow-xl dark:border-edge-dark dark:bg-surface-dark"
        style={{
          left: Math.max(0, Math.min(x, window.innerWidth - 210)),
          top: Math.max(0, Math.min(y, window.innerHeight - 220)),
        }}
      >
        {items.map((item) => (
          <button
            key={item.label}
            role="menuitem"
            type="button"
            className="block w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-subtle dark:text-ink dark:hover:bg-subtle"
            onClick={() => {
              void attempt(async () => item.run());
              onClose();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

export default ResultRow;
