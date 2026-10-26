export const dispositions = ["visualized", "reused", "parameterized", "needs-modeling", "needs-review", "unsupported", "rights-restricted", "source-unavailable", "failed", "not-yet-processed"] as const;
export type Disposition = typeof dispositions[number];
export interface SourceLocation {
  path: string; startLine: number; endLine: number; heading: string[]; cell?: number; page?:number; region?:string;
}
export interface Formula { expression: string; location: SourceLocation; evidence: "document-explicit"; representation?: "tex" | "mathml" }
export interface KnowledgeUnit {
  schemaVersion: 1; id: string; sourceId: string; origin: string; revision: string;
  contentHash: string; location: SourceLocation; format: string; language: string;
  title: string; text: string; formulas: Formula[]; references: { target: string; kind: string }[];
  conceptIds: string[]; conceptEvidence: Record<string, string[]>;
  assumptions: string[]; rights: "local-only" | "review-required" | "cleared";
  parseStatus: "parsed" | "partial" | "unsupported" | "failed"; errors: string[];
  disposition: Disposition; reason: string; modelIds: string[]; sceneIds: string[];
}
export interface MathematicalModel {
  schemaVersion: 1; id: string; version: number; conceptIds: string[];
  variables: { name: string; domain: string; unit: string }[];
  parameters: Record<string, { value: number; min: number; max: number; unit: string }>;
  equations: string[]; initialConditions: string[]; boundaryConditions: string[];
  assumptions: string[]; invariants: string[]; solver: string;
  evidence: { unitId: string; contentHash: string; formula: string; kind: "document-explicit" | "derived" | "inferred" | "unverified" }[];
  verification: { status: "unverified" | "passed" | "failed"; method: string; tolerance: number; resultHash?: string };
}
export interface VisualizationIntent {
  schemaVersion: 1; unitIds: string[]; modelId: string; dimensions: "2d" | "3d" | "field";
  timeVariable?: string; stages: string[]; objects: string[]; templateId: string;
  verificationRequirements: string[]; trust: "unreviewed" | "reviewed";
}
export interface VisualKnowledgeScene {
  id: string; modelId: string; modelVersion: number; semanticKey: string;
  unitIds: string[]; sourceHashes: Record<string, string>; conceptIds: string[];
  entry: string; scene: string; media?: string;
  mathVerified: boolean; rendered: boolean; decoded: boolean; rightsCleared: boolean;
}
/** Reuse requires identical model semantics, assumptions and version, never a title match. */
export class VisualKnowledgeRegistry {
  scenes = new Map<string, VisualKnowledgeScene>();
  register(scene: VisualKnowledgeScene) {
    if (!scene.mathVerified || !scene.rendered || !scene.decoded) throw new Error("Scene lacks independent math/render/decode evidence");
    if (!scene.unitIds.length || scene.unitIds.some(id => !scene.sourceHashes[id])) throw new Error("Scene lacks source revision evidence");
    this.scenes.set(scene.id, scene);
  }
  find(semanticKey: string, modelVersion: number) {
    return [...this.scenes.values()].find(s => s.semanticKey === semanticKey && s.modelVersion === modelVersion);
  }
  stale(sceneId: string, hashes: Record<string, string>) {
    const scene = this.scenes.get(sceneId);
    return !scene || scene.unitIds.some(id => hashes[id] !== scene.sourceHashes[id]);
  }
}
