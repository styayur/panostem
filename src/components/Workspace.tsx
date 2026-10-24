import { useEffect, useState } from "react";
import { ExternalLink, Maximize2, RotateCw } from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import * as cmd from "../lib/commands";
import type { SearchResult } from "../lib/types";
import { resourceForUrl } from "../lib/previewPolicy";
import ResourcePreview from "./ResourcePreview";
import { cn } from "../lib/cn";
import { useT } from "../lib/i18n";

export default function Workspace() {
  const t = useT();
  const [urls, setUrls] = useState<string[]>([]);
  const [resources, setResources] = useState<SearchResult[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      let label = "";
      try {
        label = getCurrentWebviewWindow().label;
      } catch {
        label = "";
      }
      try {
        const items = await cmd.getWorkspaceItems(label);
        const metadata = await cmd.getWorkspaceResources(label);
        if (mounted) {
          setUrls(items);
          setResources(metadata);
          try { setNotes(localStorage.getItem(notesKey(items)) ?? localStorage.getItem("sve-workspace-notes") ?? ""); }
          catch (e) { setError(String(e)); }
        }
      } catch (e) { if (mounted) setError(String(e)); }
      finally { if (mounted) setReady(true); }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const gridClass = urls.length <= 1 ? "grid-cols-1 grid-rows-1" : urls.length <= 2 ? "grid-cols-2 grid-rows-1" : "grid-cols-2 grid-rows-2";

  return (
      <div data-resource-workspace className="flex h-screen flex-col bg-panel text-ink">
      <div className="flex items-center gap-3 border-b border-edge px-3 py-2">
        <span className="text-[13px] font-semibold">{t("workspace.title")}</span>
        <span className="text-[11px] text-muted">{t("workspace.panes", { n: urls.length })}</span>
        <button
          type="button"
          className="ml-auto rounded px-2 py-1 text-[12px] text-ink hover:bg-subtle"
          onClick={() => setReload((r) => r + 1)}
        >
          {t("workspace.reloadAll")}
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-[12px] text-ink hover:bg-subtle"
          onClick={() => Promise.all(urls.map((u) => cmd.openExternal(u))).catch((e) => setError(String(e)))}
        >
          {t("workspace.openAll")}
        </button>
        <button type="button" className="rounded px-2 py-1 text-[12px] text-ink hover:bg-subtle"
          onClick={() => Promise.all(urls.map((u) => cmd.openWindow(u, resources.find((r) => r.url === u)?.title ?? u))).catch((e) => setError(String(e)))}>
          {t("workspace.openViewers")}
        </button>
        <a
          href="?route=search"
          className="rounded px-2 py-1 text-[12px] text-ink hover:bg-subtle"
        >
          {t("workspace.newSearch")}
        </a>
      </div>
      {error && <p role="alert" className="px-3 py-2 text-sm text-danger">{error}</p>}

      <div className={cn("grid min-h-0 flex-1 gap-px bg-subtle", gridClass)}>
        {urls.map((u, i) => (
          <Pane key={`${u}:${i}`} url={u} resource={resources.find((r) => r.url === u) ?? resourceForUrl(u)} index={i} reload={reload} onError={setError} />
        ))}
        {urls.length === 0 && (
          <div className="flex items-center justify-center bg-panel text-sm text-muted">
            {t("workspace.empty")}
          </div>
        )}
      </div>

      <div className="border-t border-edge p-2">
        <textarea
          value={notes}
          disabled={!ready}
          aria-label={t("workspace.notes")}
          onChange={(e) => {
            const value = e.target.value; setNotes(value);
            try { localStorage.setItem(notesKey(urls), value); } catch (err) { setError(String(err)); }
          }}
          placeholder={t("workspace.notes")}
          className="h-20 w-full resize-none rounded bg-subtle p-2 text-[12px] text-ink outline-none placeholder:text-muted"
        />
      </div>
    </div>
  );
}

function Pane({ url, resource, index, reload, onError }: { url: string; resource: SearchResult; index: number; reload: number; onError: (error: string) => void }) {
  const t = useT();
  const [key, setKey] = useState(0);
  const host = useHost(url);

  return (
    <div className="flex min-h-0 flex-col bg-panel">
      <div className="flex items-center gap-1 border-b border-edge px-2 py-1">
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted">{host}</span>
        <button
          type="button"
          title={t("preview.reload")}
          className="rounded p-1 text-muted hover:bg-subtle hover:text-ink"
          onClick={() => setKey((k) => k + 1)}
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <button type="button" title={t("row.openWindow")} className="rounded p-1 text-muted hover:bg-subtle"
          onClick={() => cmd.openWindow(url, resource.title).catch((e) => onError(String(e)))}><Maximize2 className="h-3.5 w-3.5" /></button>
        <button
          type="button"
          title={t("preview.browser")}
          className="rounded p-1 text-muted hover:bg-subtle hover:text-ink"
          onClick={() => cmd.openExternal(url).catch((e) => onError(String(e)))}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1"><ResourcePreview key={resource.url} result={resource} reloadKey={`${index}:${key}:${reload}`} /></div>
    </div>
  );
}

function notesKey(urls: string[]): string { return `sve-workspace-notes:${JSON.stringify([...urls].sort())}`; }

function useHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
