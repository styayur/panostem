import { useKnowledgeStore, findKnowledge } from "./store";
import { useSettingsStore } from "../stores/settingsStore";
import "./knowledge.css";
export function KnowledgeMatches({ query, conceptId }: { query?: string; conceptId?: string }) {
  const units = useKnowledgeStore(s => s.units), select = useKnowledgeStore(s => s.select);
  const locale = useSettingsStore(s => s.settings.ui_locale);
  if (!units.length || (!query && !conceptId)) return null;
  const found = findKnowledge(units, query ?? "", conceptId);
  if (!found.length) return null;
  const label = locale === "en" ? "Local knowledge" : locale === "zh-CN" ? "本地知识" : "本機知識";
  return <section className="knowledge-matches" aria-label={label}><strong>{label} ({found.length})</strong>{found.slice(0, 3).map(u => <button key={u.id} onClick={() => { select(u.id); useSettingsStore.getState().setPage("knowledge"); }}>{u.title} · {u.location.path}:{u.location.startLine}</button>)}</section>;
}
