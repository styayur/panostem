import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  BookMarked,
  Code2,
  Check,
  Languages,
  Moon,
  Search,
  Settings,
  Sun,
  SunMoon,
} from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useSettingsStore, type Page } from "./stores/settingsStore";
import { useSearchStore } from "./stores/searchStore";
import { installShortcuts } from "./lib/shortcuts";
import { useT, UI_LOCALES } from "./lib/i18n";
import { TARGET_LANGUAGES, type UiLocale } from "./lib/types";
import { cn } from "./lib/cn";
import { IconButton } from "./components/ui";
import Workspace from "./components/Workspace";
import SearchPage from "./pages/SearchPage";
import FavoritesPage from "./pages/FavoritesPage";
import SettingsPage from "./pages/SettingsPage";
import { reportError, useNoticeStore } from "./stores/noticeStore";
import { useWorkbenchStore } from "./workbench/workbenchStore";
import { conceptById } from "./lib/concepts";
import { studioText } from "./studio/uiText";
import { localize } from "./learning/types";
const StudioPage = lazy(() => import("./studio/StudioPage"));

export default function App() {
  const t = useT();
  const page = useSettingsStore((s) => s.page);
  const setPage = useSettingsStore((s) => s.setPage);
  const theme = useSettingsStore((s) => s.settings.theme);
  const locale = useSettingsStore((s) => s.settings.ui_locale);
  const update = useSettingsStore((s) => s.update);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadFavorites = useSearchStore((s) => s.loadFavorites);
  const loadHistory = useSearchStore((s) => s.loadHistory);
  const [isWorkspace, setIsWorkspace] = useState(false);
  const notice = useNoticeStore((s) => s.error);
  const clearNotice = useNoticeStore((s) => s.clear);

  useEffect(() => {
    loadSettings().catch(reportError);
    loadFavorites().catch(reportError);
    loadHistory().catch(reportError);
  }, [loadSettings, loadFavorites, loadHistory]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("route") === "studio") { setPage("studio"); return; }
    const concept=params.get("concept");
    if(params.get("route")==="search"&&concept&&conceptById.has(concept))useWorkbenchStore.getState().open(concept,{type:"resource"});
    if (params.get("route") === "search") return;
    if (params.get("workspace") === "1" || params.get("route") === "workspace") {
      setIsWorkspace(true);
      return;
    }
    try {
      setIsWorkspace(getCurrentWebviewWindow().label.startsWith("workspace-"));
    } catch {
      setIsWorkspace(false);
    }
  }, []);

  useEffect(() => isWorkspace ? undefined : installShortcuts(), [isWorkspace]);

  if (isWorkspace) return <Workspace />;

  return (
    <div className="app-shell flex h-screen flex-col bg-canvas-light text-ink dark:bg-canvas-dark dark:text-ink">
      <a className="skip-link" href="#main-content">{t("common.skipContent")}</a>
      <header className="app-header flex items-center gap-2 border-b border-edge-light bg-panel px-3 py-2 dark:border-edge-dark dark:bg-surface-dark">
        <div className="app-brand mr-2 flex items-center gap-2">
          <img className="h-7 w-7" src={`${import.meta.env.BASE_URL}panostem.svg`} alt="" aria-hidden="true" />
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">Panostem</div>
            <div className="hidden text-[11px] text-muted sm:block">{t("app.subtitle")}</div>
          </div>
        </div>

        <nav aria-label={t("app.navigation")} className="app-nav flex items-center gap-1">
          <NavButton active={page === "studio"} onClick={() => setPage("studio")} icon={<Code2 className="h-3.5 w-3.5" />} label={localize(studioText.studio,locale)} />
          <NavButton
            active={page === "search"}
            onClick={() => setPage("search")}
            icon={<Search className="h-3.5 w-3.5" />}
            label={t("nav.search")}
          />
          <NavButton
            active={page === "favorites"}
            onClick={() => setPage("favorites")}
            icon={<BookMarked className="h-3.5 w-3.5" />}
            label={t("nav.favorites")}
          />
          <NavButton
            active={page === "settings"}
            onClick={() => setPage("settings")}
            icon={<Settings className="h-3.5 w-3.5" />}
            label={t("nav.settings")}
          />
        </nav>

        <div className="app-tools ml-auto flex items-center gap-1">
          <LanguageMenu />
          <ThemeButton
            theme={theme}
            label={t("theme.tooltip", {
              theme: t(
                theme === "system" ? "theme.system" : theme === "light" ? "theme.light" : "theme.dark"
              ),
            })}
            onCycle={() => {
              const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
              update({ theme: next });
            }}
          />
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="min-h-0 flex-1">
        {notice && <div role="alert" className="fixed bottom-4 left-4 right-4 z-[60] flex items-center gap-3 rounded-lg border border-danger bg-panel p-3 text-sm text-danger shadow-lg dark:bg-panel dark:text-danger">
          <span className="min-w-0 flex-1 break-words">{notice}</span>
          <button type="button" onClick={clearNotice} aria-label={t("common.close")}>×</button>
        </div>}
        {page === "search" && <SearchPage />}
        {page === "favorites" && <FavoritesPage />}
        {page === "settings" && <SettingsPage />}
        {page === "studio" && <Suspense fallback={<p className="p-6">…</p>}><StudioPage /></Suspense>}
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "bg-accent/10 text-accent dark:text-accent"
          : "text-muted hover:bg-subtle dark:text-muted dark:hover:bg-subtle"
      )}
    >
      {icon}
      <span className="nav-label hidden sm:inline">{label}</span>
    </button>
  );
}

function ThemeButton({
  theme,
  label,
  onCycle,
}: {
  theme: string;
  label: string;
  onCycle: () => void;
}) {
  const icon =
    theme === "system" ? (
      <SunMoon className="h-4 w-4" />
    ) : theme === "light" ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Moon className="h-4 w-4" />
    );
  return (
    <IconButton title={label} onClick={onCycle}>
      {icon}
    </IconButton>
  );
}

/** Header popover: UI language + content translation settings. */
function LanguageMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); ref.current?.querySelector("button")?.focus(); }
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onClick); window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <IconButton title={t("settings.translation")} active={open} onClick={() => setOpen((v) => !v)}>
        <Languages className="h-4 w-4" />
      </IconButton>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-[268px] rounded-lg border border-edge-light bg-panel p-3 text-[13px] shadow-xl dark:border-edge-dark dark:bg-surface-dark">
          <div className="mb-1 text-[11px] font-semibold text-muted">
            {t("settings.uiLanguage")}
          </div>
          <div className="mb-3 space-y-1">
            {UI_LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => update({ ui_locale: l.code as UiLocale })}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left",
                  settings.ui_locale === l.code
                    ? "bg-accent/10 text-accent dark:text-accent"
                    : "hover:bg-subtle dark:hover:bg-subtle"
                )}
              >
                <span>{l.label}</span>
                {settings.ui_locale === l.code && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>

          <div className="mb-1 text-[11px] font-semibold text-muted">
            {t("settings.targetLanguage")}
          </div>
          <select
            value={settings.translate_target}
            onChange={(e) => update({ translate_target: e.target.value })}
            className="mb-3 w-full rounded-md border border-edge-light bg-panel px-2 py-1.5 text-[12px] dark:border-edge-dark dark:bg-surface-dark dark:text-ink"
          >
            {TARGET_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={settings.translate_results}
              onChange={(e) => update({ translate_results: e.target.checked })}
              className="mt-0.5 h-3.5 w-3.5 accent-accent"
            />
            <span className="text-[12px] leading-snug">{t("settings.translateResults")}</span>
          </label>
        </div>
      )}
    </div>
  );
}
