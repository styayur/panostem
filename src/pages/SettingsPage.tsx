import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";
import { useSettingsStore } from "../stores/settingsStore";
import { useT, UI_LOCALES } from "../lib/i18n";
import { TARGET_LANGUAGES, type UiLocale } from "../lib/types";
import * as cmd from "../lib/commands";
import type { ProviderInfo } from "../lib/types";
import { cn } from "../lib/cn";
import { useSearchStore } from "../stores/searchStore";
import { reportError } from "../stores/noticeStore";

export default function SettingsPage() {
  const t = useT();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const history = useSearchStore((s) => s.history);
  const clearHistory = useSearchStore((s) => s.clearHistory);

  const reload = async () => {
    setProviders(await cmd.providersInfo());
  };

  useEffect(() => {
    reload().catch(reportError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async (id: string) => {
    setBusy(id);
    try {
      await cmd.refreshProviderIndex(id);
      await reload();
      setMessage(t("settings.refreshed"));
    } catch (e) { reportError(e);
    } finally {
      setBusy(null);
    }
  };

  const clear = async () => {
    setBusy("cache");
    try {
      await cmd.clearCache();
      await reload();
      setMessage(t("settings.cleared"));
    } catch (e) { reportError(e);
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (id: string, enabled: boolean) => {
    const current = useSettingsStore.getState().settings.enabled_providers;
    const next = enabled ? [...new Set([...current, id])] : current.filter((p) => p !== id);
    await update({ enabled_providers: next });
    const search = useSearchStore.getState();
    if (!enabled && search.siteFilter === id) search.setSiteFilter(null);
    if (search.response) await search.runSearch(search.response.query);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <h2 className="text-lg font-semibold">{t("settings.title")}</h2>
        {message && <p role="status" className="my-2 text-sm text-accent">{message}</p>}

        <Section title={t("settings.translation")}>
          <SettingRow label={t("settings.uiLanguage")}>
            <div className="flex gap-1.5">
              {UI_LOCALES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => update({ ui_locale: l.code as UiLocale })}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[12px]",
                    settings.ui_locale === l.code
                      ? "border-accent/50 bg-accent/10 text-accent dark:text-accent"
                      : "border-edge-light text-muted dark:border-edge-dark dark:text-muted"
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label={t("settings.targetLanguage")}>
            <select
              aria-label={t("settings.targetLanguage")}
              value={settings.translate_target}
              onChange={(e) => update({ translate_target: e.target.value })}
              className="w-[190px] rounded-md border border-edge-light bg-panel px-2 py-1 text-[12px] dark:border-edge-dark dark:bg-surface-dark dark:text-ink"
            >
              {TARGET_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </SettingRow>

          <SettingRow label={t("settings.translateResults")}>
            <Toggle
              label={t("settings.translateResults")}
              on={settings.translate_results}
              onToggle={() => update({ translate_results: !settings.translate_results })}
            />
          </SettingRow>
          <p className="mb-3 -mt-2 text-[11px] text-muted">
            {t("settings.translateResultsHint")}
          </p>

          <div className="mb-1 text-[13px] text-muted dark:text-ink">
            {t("settings.pageProxy")}
          </div>
          <input
            aria-label={t("settings.pageProxy")}
            value={settings.page_translate_proxy}
            onChange={(e) => update({ page_translate_proxy: e.target.value })}
            placeholder={"https://your-proxy/?url={url}&lang={lang}"}
            spellCheck={false}
            className="mb-1 w-full rounded-md border border-edge-light bg-panel px-2 py-1.5 font-mono text-[11px] dark:border-edge-dark dark:bg-surface-dark dark:text-ink"
          />
          <p className="mb-3 text-[11px] text-muted">{t("settings.pageProxyHint")}</p>
          <p className="text-[11px] text-muted">{t("settings.engineNote")}</p>
        </Section>

        <Section title={t("settings.appearance")}>
          <SettingRow label={t("settings.theme")}>
            <div className="flex gap-1.5">
              {(["system", "light", "dark"] as const).map((th) => (
                <button
                  key={th}
                  type="button"
                  onClick={() => update({ theme: th })}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[12px]",
                    settings.theme === th
                      ? "border-accent/50 bg-accent/10 text-accent dark:text-accent"
                      : "border-edge-light text-muted dark:border-edge-dark dark:text-muted"
                  )}
                >
                  {t(th === "system" ? "theme.system" : th === "light" ? "theme.light" : "theme.dark")}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label={t("settings.previewMode")}>
            <div className="flex gap-1.5">
              {(["side", "inline", "off"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update({ preview_mode: m })}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[12px] capitalize",
                    settings.preview_mode === m
                      ? "border-accent/50 bg-accent/10 text-accent dark:text-accent"
                      : "border-edge-light text-muted dark:border-edge-dark dark:text-muted"
                  )}
                >
                  {t(`preview.mode.${m}`)}
                </button>
              ))}
            </div>
          </SettingRow>

        </Section>

        <Section title={t("settings.sources")}>
          <p className="mb-2 text-[12px] text-muted">{t("settings.sourcesHint")}</p>
          <div className="overflow-hidden rounded-lg border border-edge-light dark:border-edge-dark">
            {providers.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 border-b border-edge-light/70 px-3 py-2 last:border-0 dark:border-edge-dark/70"
              >
                <input
                  type="checkbox"
                  aria-label={p.name}
                  checked={settings.enabled_providers.includes(p.id)}
                  onChange={(e) => toggle(p.id, e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{p.name}</span>
                    {p.experimental && (
                      <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[11px] font-semibold text-warning dark:text-warning">
                        experimental
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-muted">{p.homepage}</div>
                  <div className="text-[11px] text-muted">
                    {t("settings.indexed")}: {p.indexed_items ?? "—"} ·{" "}
                    {t("settings.lastUpdated")}: {p.last_updated ?? t("settings.never")}
                  </div>
                </div>
                <button
                  type="button"
                  title={t("settings.refreshIndex")}
                  disabled={busy !== null}
                  className="rounded p-1.5 text-muted hover:bg-subtle hover:text-accent disabled:opacity-100 dark:hover:bg-subtle"
                  onClick={() => refresh(p.id)}
                >
                  <RefreshCw className={cn("h-4 w-4", busy === p.id && "animate-spin")} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={clear}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-md border border-edge-light px-2.5 py-1.5 text-[12px] text-muted hover:bg-subtle dark:border-edge-dark dark:text-ink dark:hover:bg-subtle"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t("settings.clearCache")}
            </button>
            <span className="flex items-center gap-1 text-[11px] text-muted">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("settings.cacheNote")}
            </span>
          </div>
        </Section>

        <Section title={t("history.title")}>
          <button type="button" onClick={clearHistory} disabled={!history.length} className="mb-3 rounded border border-edge-light px-3 py-1 text-sm disabled:opacity-100 dark:border-edge-dark">{t("history.clear")}</button>
          {!history.length && <p className="text-sm text-muted">{t("history.empty")}</p>}
          <div className="max-h-56 overflow-y-auto">
            {history.map((h) => <button type="button" key={h.id} onClick={() => {
              useSettingsStore.getState().setPage("search");
              const search = useSearchStore.getState(); search.setSiteFilter(null); search.setTypeFilter("all");
              void search.runSearch(h.query);
            }} className="flex w-full justify-between gap-3 rounded px-2 py-1 text-left text-sm hover:bg-subtle dark:hover:bg-subtle"><span className="truncate">{h.query}</span><span className="shrink-0 text-muted">{t("filter.count", { n: h.result_count })}</span></button>)}
          </div>
        </Section>

        <Section title={t("settings.about")}>
          <p className="text-[13px] text-muted dark:text-muted">{t("settings.aboutText")}</p>
          <p className="mt-2 text-[12px] text-muted">{t("settings.license")}</p>
        </Section>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        "relative h-5 w-9 rounded transition-colors",
        on ? "bg-accent-solid" : "bg-panel dark:bg-panel"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded bg-panel transition-transform",
          on ? "left-[18px]" : "left-0.5"
        )}
      />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-[12px] font-semibold text-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-[13px] text-muted dark:text-ink">{label}</span>
      {children}
    </div>
  );
}
