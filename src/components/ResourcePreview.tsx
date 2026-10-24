import { useEffect, useState } from "react";
import type { SearchResult } from "../lib/types";
import { previewCapability, resourceFrameUrl } from "../lib/previewPolicy";
import { resourceConcepts, type Concept } from "../lib/concepts";
import { useSettingsStore } from "../stores/settingsStore";
import { useT, typeLabelKey } from "../lib/i18n";
import { attempt } from "../stores/noticeStore";
import * as cmd from "../lib/commands";
import { useWorkbenchStore } from "../workbench/workbenchStore";
import { useSearchStore } from "../stores/searchStore";

export default function ResourcePreview({ result, reloadKey = 0 }: { result: SearchResult; reloadKey?: string | number }) {
  const t = useT();
  const locale = useSettingsStore((s) => s.settings.ui_locale);
  const [failed, setFailed] = useState(false);
  const capability = previewCapability(result);
  const frameUrl = resourceFrameUrl(result);
  useEffect(() => setFailed(false), [result.url, reloadKey]);
  const graph = resourceConcepts(result.title, result.tags);
  const label = (c: Concept) => locale === "zh-CN" ? c.zh_cn : locale === "zh-TW" ? c.zh_tw : c.en;
  const showConcepts = (items: Concept[]) => items.length ? items.map(c=><a key={c.id} data-resource-concept-link={c.id} className="inline-block px-1 py-2 text-accent underline dark:text-accent" href={`?route=search&concept=${encodeURIComponent(c.id)}`} onClick={e=>{
    if(document.querySelector("[data-resource-workspace]"))return;
    e.preventDefault();useSearchStore.getState().setQuickLook(null);useSettingsStore.getState().setPage("search");useWorkbenchStore.getState().open(c.id,{type:"resource"});
  }}>{label(c)}</a>) : t("resource.unmapped");
  if (frameUrl && !failed) return <div className="flex h-full min-h-0 flex-col" data-preview-capability="Embed">
    <iframe key={reloadKey} title={result.title} src={frameUrl} className="min-h-0 flex-1 border-0 bg-panel"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    <button type="button" className="px-3 py-1 text-xs text-accent" onClick={() => setFailed(true)}>{t("resource.useCard")}</button>
  </div>;
  return <article data-testid="resource-card" data-preview-capability={capability} className="h-full overflow-auto bg-surface-light p-4 text-ink dark:bg-panel dark:text-ink">
    <div className="text-xs text-muted">{result.source_name} · {t(typeLabelKey(result.result_type))}</div>
    <h2 className="mt-2 break-words text-lg font-semibold">{result.title}</h2>
    <p className="mt-3 text-sm">{result.description || t("resource.noSummary")}</p>
    <dl className="mt-4 space-y-3 text-sm">
      <div><dt className="font-semibold">{t("resource.tags")}</dt><dd>{result.tags.join(" · ") || t("resource.unmapped")}</dd></div>
      <div><dt className="font-semibold">{t("resource.concepts")}</dt><dd>{showConcepts(graph.concepts)}</dd></div>
      <div><dt className="font-semibold">{t("resource.related")}</dt><dd>{showConcepts(graph.related)}</dd></div>
      <div><dt className="font-semibold">{t("resource.prerequisites")}</dt><dd>{showConcepts(graph.prerequisites)}</dd></div>
    </dl>
    <p className="mt-3 text-xs text-muted">{t("resource.graphNote")}</p>
    <p className="mt-3 text-xs text-muted">{capability === "ExternalOnly" ? t("resource.externalOnly") : t("resource.nativeCard")}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" className="rounded bg-accent-solid px-3 py-2 text-sm text-white" onClick={() => attempt(() => cmd.openWindow(result.url, result.title))}>{t("row.openWindow")}</button>
      <button type="button" className="rounded border border-edge px-3 py-2 text-sm" onClick={() => attempt(() => cmd.openExternal(result.url))}>{t("preview.browser")}</button>
    </div>
  </article>;
}
