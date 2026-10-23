import { conceptById } from "../lib/concepts.ts";

export interface Parameter {
  type: "number" | "integer" | "boolean" | "string";
  default: number | boolean | string;
  min?: number;
  max?: number;
}
export interface SceneMetadata {
  version: 1;
  id: string;
  title: string;
  description: string;
  entry: string;
  scene: string;
  license: string;
  concept_ids: string[];
  prerequisites?: string[];
  learning_objectives: string[];
  source_ids?: string[];
  checkpoints?: string[];
  parameters?: Record<string, Parameter>;
}
export function safePath(name: string): string {
  if (
    typeof name !== "string" ||
    !name ||
    name.length > 240 ||
    /[\\:\x00-\x1f]/.test(name) ||
    name.startsWith("/")
  )
    throw new Error("Unsafe file path");
  if (
    name
      .split("/")
      .some(
        (p) =>
          !p ||
          p === "." ||
          p === ".." ||
          /[. ]$/.test(p) ||
          /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\..*)?$/i.test(p),
      )
  )
    throw new Error("Unsafe file path component");
  return name;
}
export function parameterValues(
  specs: Record<string, Parameter>,
  values: Record<string, unknown>,
) {
  if (
    Object.keys(values).some(
      (key) => !Object.prototype.hasOwnProperty.call(specs, key),
    )
  )
    throw new Error("Unknown scene parameter");
  return Object.fromEntries(
    Object.entries(specs).map(([name, spec]) => {
      const value = Object.prototype.hasOwnProperty.call(values, name)
        ? values[name]
        : spec.default;
      if (spec.type === "number" || spec.type === "integer") {
        if (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          !Number.isFinite(spec.min) ||
          !Number.isFinite(spec.max) ||
          spec.min! > spec.max! ||
          value < spec.min! ||
          value > spec.max! ||
          (spec.type === "integer" && !Number.isInteger(value))
        )
          throw new Error(`Invalid numeric parameter: ${name}`);
      } else if (spec.type === "boolean") {
        if (typeof value !== "boolean")
          throw new Error(`Invalid boolean parameter: ${name}`);
      } else if (spec.type === "string") {
        if (typeof value !== "string" || value.length > 1024)
          throw new Error(`Invalid string parameter: ${name}`);
      } else throw new Error("Unsupported parameter type");
      return [name, value];
    }),
  );
}
export function validateMetadata(input: unknown): SceneMetadata {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Missing scene metadata");
  const m = input as SceneMetadata;
  if (!Array.isArray(m.concept_ids) || !Array.isArray(m.learning_objectives)) {
    throw new Error(
      "Scene metadata requires concept_ids and learning_objectives arrays",
    );
  }
  if (m.version !== 1)
    throw new Error("Unsupported scene metadata version (expected 1)");
  for (const field of [
    "id",
    "title",
    "description",
    "entry",
    "scene",
    "license",
  ] as const)
    if (typeof m[field] !== "string" || m[field].length > 8192)
      throw new Error(`Invalid metadata field: ${field}`);
  safePath(m.entry);
  if (!m.entry.endsWith(".py") || !/^[_\p{ID_Start}][\p{ID_Continue}]*$/u.test(m.scene))
    throw new Error("Invalid Python scene entry");
  for (const field of ["concept_ids", "prerequisites"] as const) {
    if (
      !Array.isArray(m[field] ?? []) ||
      (m[field] ?? []).some(
        (id) => typeof id !== "string" || !conceptById.has(id),
      )
    )
      throw new Error(`Unresolved concept ID in ${field}`);
  }
  for (const field of [
    "learning_objectives",
    "source_ids",
    "checkpoints",
  ] as const)
    if (
      !Array.isArray(m[field] ?? []) ||
      (m[field] ?? []).length > 128 ||
      (m[field] ?? []).some((v) => typeof v !== "string" || v.length > 8192)
    )
      throw new Error(`Invalid ${field}`);
  if (
    !m.parameters ||
    typeof m.parameters !== "object" ||
    Array.isArray(m.parameters)
  ) {
    if (m.parameters !== undefined) throw new Error("Invalid parameters");
  }
  if (Object.keys(m.parameters ?? {}).length > 32)
    throw new Error("Too many parameters");
  for (const [name, spec] of Object.entries(m.parameters ?? {})) {
    if (!/^[A-Za-z_]\w{0,63}$/.test(name) || !spec || typeof spec !== "object")
      throw new Error("Invalid parameter definition");
  }
  parameterValues(m.parameters ?? {}, {});
  return m;
}

export interface Project {
  root: string;
  files: { path: string; size: number }[];
  scenes: { file: string; name: string }[];
  errors: { file: string; line: number; message: string }[];
  metadata: SceneMetadata | null;
  revision: string;
}
export interface RunResult {
  revision: string;
  metadata?: SceneMetadata | null;
  media: { path: string; size: number }[];
  output: string;
  elapsed: number;
  mode: string;
  entry: string;
  scene: string;
}
export interface Task {
  id: string;
  action: string;
  project: string;
  status: "running" | "completed" | "failed" | "cancelled";
  logs: string[];
  elapsed: number;
  result: RunResult | null;
  error: string | null;
}
