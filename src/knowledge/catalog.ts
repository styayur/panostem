import data from "./models.json" with { type: "json" };
import type { MathematicalModel, VisualizationIntent } from "./types.ts";
import type { SceneMetadata } from "../studio/contracts.ts";
import type { LocalizedText } from "../learning/types.ts";
export interface KnowledgeModel {
  id: string; title: LocalizedText; metadata: SceneMetadata; model: MathematicalModel; intent: VisualizationIntent;
  sources: { unitId:string; revision:string; contentHash:string; url:string; location:{path:string;startLine:number;endLine:number;cell?:number;page?:number;region?:string} }[];
  sourceHash:string; helperHash:string;
  verification:{math:boolean;render:boolean;decode:boolean;verificationHash:string};
  redistribution:string; sharePath:string|null; mediaPath:string|null; mediaHash?:string; shareHash?:string;
}
// Generated JSON is checked by knowledge_catalog_test; inference introduces
// optional parameter keys across heterogeneous models that are absent at runtime.
export const knowledgeModels = data as unknown as KnowledgeModel[];
export const knowledgeModelById = new Map(knowledgeModels.map(m=>[m.id,m]));
export const modelsForConcept = (id:string) => knowledgeModels.filter(m=>m.metadata.concept_ids.includes(id));
