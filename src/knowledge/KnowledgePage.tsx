import { useState } from "react";
import { parseDocument } from "./parse";
import { useKnowledgeStore, findKnowledge } from "./store";
import { useSettingsStore } from "../stores/settingsStore";
import { useWorkbenchStore } from "../workbench/workbenchStore";
import { conceptById } from "../lib/concepts";
import { L, localize } from "../learning/types";
import "./knowledge.css";
const strings = {
  title: L("Knowledge sources", "知识来源", "知識來源"),
  import: L("Read documents", "读取文档", "讀取文件"),
  folder: L("Read a directory", "读取目录", "讀取目錄"),
  privacy: L("Documents stay in this session on your device. Reading never runs document code or installs dependencies.", "文档仅保留在本机当前会话。读取不会运行文档代码或安装依赖。", "文件僅保留在本機目前工作階段。讀取不會執行文件程式碼或安裝相依套件。"),
  clear: L("Clear index", "清理索引", "清理索引"), undo: L("Undo", "撤销", "復原"),
  search: L("Search local knowledge", "搜索本地知识", "搜尋本機知識"),
  empty: L("Choose Markdown, TeX, R Markdown, Notebook or HTML documents to inspect their knowledge structure.", "选择 Markdown、TeX、R Markdown、Notebook 或 HTML 文档，检查知识结构。", "選擇 Markdown、TeX、R Markdown、Notebook 或 HTML 文件，檢查知識結構。"),
  source: L("Source location", "来源位置", "來源位置"), formula: L("Explicit formulas", "来源公式", "來源公式"),
  concepts: L("Related concepts", "相关概念", "相關概念"),
  state: L("Needs mathematical and rights review", "待数学与许可审查", "待數學與授權審查"),
  noScene: L("No verified scene is bound to this source revision.", "此来源版本尚未绑定已验证场景。", "此來源版本尚未綁定已驗證場景。"),
  rights: L("Local private index; redistribution has not been cleared.", "本地私有索引；尚未确认再分发许可。", "本機私人索引；尚未確認再散布授權。"),
  loading: L("Reading…", "读取中…", "讀取中…"),
  errors: L("Read errors", "读取错误", "讀取錯誤"),
};
export default function KnowledgePage() {
  const { units, replace, previous, undo, selectedId, select } = useKnowledgeStore();
  const locale = useSettingsStore(s => s.settings.ui_locale);
  const t = (key: keyof typeof strings) => localize(strings[key], locale);
  const [query, setQuery] = useState(""), [busy, setBusy] = useState(false), [errors, setErrors] = useState<string[]>([]);
  const found = findKnowledge(units, query), selected = found.find(u => u.id === selectedId) ?? found[0];
  async function read(files: FileList | null) {
    if (!files || busy) return;
    setBusy(true); const next = new Map(units.map(u => [u.id, u])); const failures: string[] = [];
    try {
      if (files.length > 5000 || [...files].reduce((sum, f) => sum + f.size, 0) > 64_000_000) throw new Error("Import scope exceeds 5,000 files or 64 MB; narrow the selection");
      for (const file of files) {
        const path = file.webkitRelativePath || file.name;
        if (path.split("/").some(p => [".git", ".obsidian", "node_modules", ".venv", "target"].includes(p))) continue;
        if (!/\.(md|markdown|tex|rmd|ipynb|html?)$/i.test(path)) continue;
        try {
          if (file.size > 2_000_000) throw new Error("Document exceeds 2 MB");
          const bytes = await file.arrayBuffer();
          const contentHash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(v => v.toString(16).padStart(2, "0")).join("");
          const sourceId = `local:${path.includes("/") ? path.split("/")[0] : "selected-documents"}`;
          const parsed = parseDocument({ sourceId, path, origin: path, revision: contentHash, contentHash, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) });
          // Replace an entire prior document, including sections removed by a later revision.
          for (const [id, old] of next) if (old.sourceId === sourceId && old.location.path === path) next.delete(id);
          parsed.forEach(u => next.set(u.id, u));
        } catch (e) { failures.push(`${path}: ${String(e)}`); }
      }
      replace([...next.values()]);
    } catch (e) { failures.push(String(e)); }
    finally { setErrors(failures); setBusy(false); }
  }
  return <div className="knowledge-page">
    <header><h1>{t("title")}</h1><p>{t("privacy")}</p>
      <div className="knowledge-tools">
        <label className="ps-button">{busy ? t("loading") : t("import")}<input aria-label={t("import")} type="file" multiple accept=".md,.markdown,.tex,.rmd,.ipynb,.html,.htm" disabled={busy} onChange={e => { void read(e.target.files); e.target.value = ""; }} /></label>
        <label className="ps-button">{t("folder")}<input aria-label={t("folder")} type="file" multiple {...{ webkitdirectory: "" }} disabled={busy} onChange={e => { void read(e.target.files); e.target.value = ""; }} /></label>
        <button disabled={!units.length || busy} onClick={() => replace([])}>{t("clear")}</button>
        <button disabled={!previous.length || busy} onClick={undo}>{t("undo")}</button>
        <span role="status">{found.length} / {units.length}</span>
      </div>
      <label>{t("search")}<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
      {errors.length > 0 && <details open><summary role="alert">{t("errors")} ({errors.length})</summary>{errors.map((error, i) => <pre key={i}>{error}</pre>)}</details>}
    </header>
    {!units.length ? <p className="knowledge-empty">{t("empty")}</p> : <div className="knowledge-layout">
      <aside aria-label={t("search")}>{found.slice(0, 200).map(u => <button key={u.id} aria-pressed={selected?.id === u.id} onClick={() => select(u.id)}><strong>{u.title}</strong><small>{u.location.path}:{u.location.startLine}</small></button>)}{found.length > 200 && <p>200 / {found.length}</p>}</aside>
      {selected && <article><h2>{selected.title}</h2><p className="knowledge-state">{t("state")}</p><h3>{t("source")}</h3><p>{selected.location.path}:{selected.location.startLine}–{selected.location.endLine}{selected.location.cell === undefined ? "" : ` [cell ${selected.location.cell}]`}</p><code>{selected.contentHash}</code>
        <pre className="knowledge-document">{selected.text}</pre>
        <h3>{t("formula")}</h3>{selected.formulas.map((f, i) => <pre key={i}>{f.expression}</pre>)}
        <h3>{t("concepts")}</h3><div className="knowledge-tools">{selected.conceptIds.map(id => <button key={id} onClick={() => { useWorkbenchStore.getState().open(id, { type: "search" }); useSettingsStore.getState().setPage("search"); }}>{locale === "en" ? conceptById.get(id)?.en : locale === "zh-CN" ? conceptById.get(id)?.zh_cn : conceptById.get(id)?.zh_tw}</button>)}</div>
        <p>{t("noScene")}</p><p>{t("rights")}</p>{selected.errors.map((e, i) => <p key={i}>{e}</p>)}
      </article>}
    </div>}
  </div>;
}
