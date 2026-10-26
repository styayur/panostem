import { create } from "zustand";
import type { KnowledgeUnit } from "./types.ts";
interface State {
  units: KnowledgeUnit[]; previous: KnowledgeUnit[][]; selectedId: string | null;
  replace: (units: KnowledgeUnit[]) => void; remove: (sourceId: string) => void;
  undo: () => void; select: (id: string) => void;
}
/** Session-local by default. No cloud, telemetry, translation or automatic persistence. */
export const useKnowledgeStore = create<State>((set, get) => ({
  units: [], previous: [], selectedId: null,
  replace: units => set(s => ({ units, previous: [...s.previous.slice(-4), s.units], selectedId: null })),
  remove: sourceId => get().replace(get().units.filter(u => u.sourceId !== sourceId)),
  undo: () => set(s => s.previous.length ? { units: s.previous[s.previous.length - 1], previous: s.previous.slice(0, -1), selectedId: null } : {}),
  select: selectedId => set({ selectedId }),
}));
export function findKnowledge(units: KnowledgeUnit[], query: string, conceptId?: string) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return units.filter(u => (!conceptId || u.conceptIds.includes(conceptId)) && words.every(w => `${u.title}\n${u.text}`.toLocaleLowerCase().includes(w)));
}
