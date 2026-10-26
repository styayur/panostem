import { useKnowledgeStore, findKnowledge } from "./store";
import { useSettingsStore } from "../stores/settingsStore";
import "./knowledge.css";
import { modelsForConcept, knowledgeModels } from "./catalog";
import { useModelSelection } from "./selection";
import { localize } from "../learning/types";
import { resourceConcepts } from "../lib/concepts";
export function KnowledgeMatches({ query, conceptId }: { query?: string; conceptId?: string }) {
  const units = useKnowledgeStore(s => s.units), select = useKnowledgeStore(s => s.select);
  const locale = useSettingsStore(s => s.settings.ui_locale);
  if (!query && !conceptId) return null;
  const found = findKnowledge(units, query ?? "", conceptId);
  const conceptIds=conceptId?[conceptId]:resourceConcepts(query??"",[]).concepts.map(c=>c.id);
  const literal=(query??"").trim().toLocaleLowerCase();
  const named=literal?knowledgeModels.filter(m=>Object.values(m.title).some(title=>title.toLocaleLowerCase().includes(literal))):[];
  const models=[...new Map([...conceptIds.flatMap(modelsForConcept),...named].map(m=>[m.id,m])).values()];
  if (!found.length&&!models.length) return null;
  const label = locale === "en" ? "Knowledge and models" : locale === "zh-CN" ? "知识与模型" : "知識與模型";
  return <section className="knowledge-matches" aria-label={label}><strong>{label} ({found.length+models.length})</strong>{found.slice(0, 3).map(u => <button key={u.id} onClick={() => { useModelSelection.getState().clear();select(u.id); useSettingsStore.getState().setPage("knowledge"); }}>{u.title} · {u.location.path}:{u.location.startLine}</button>)}{models.map(model=><button key={model.id} onClick={()=>{useModelSelection.getState().select(model.id,"model");useSettingsStore.getState().setPage("knowledge");}}>{localize(model.title,locale)}</button>)}</section>;
}
