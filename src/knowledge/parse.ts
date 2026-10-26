import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkFrontmatter from "remark-frontmatter";
import { parse as parseHtml } from "parse5";
import { concepts, normalizeTerm } from "../lib/concepts.ts";
import type { KnowledgeUnit, SourceLocation, Formula } from "./types.ts";

interface Node {
  type: string; value?: string; url?: string; depth?: number; children?: Node[];
  position?: { start: { line: number; offset?: number }; end: { line: number; offset?: number } };
}
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkFrontmatter, ["yaml", "toml"]);
const textOf = (node: Node): string => node.value ?? (node.children ?? []).map(textOf).join(" ");
export interface DocumentInput { sourceId: string; path: string; origin: string; revision: string; contentHash: string; text: string; rights?: KnowledgeUnit["rights"] }
const labels = concepts.map(c => ({ id: c.id, labels: [...new Set([c.en, c.zh_cn, c.zh_tw, ...c.synonyms])].filter(label => label.length > 1).map(label => ({ label, normalized: normalizeTerm(label), cjk: /[\u3400-\u9fff]/.test(label) })) }));
function resolveConcepts(text: string) {
  const normalized = normalizeTerm(text);
  const evidence: Record<string, string[]> = {};
  for (const c of labels) {
    const found = c.labels.filter(({ normalized: label, cjk }) => {
      let at = normalized.indexOf(label);
      while (at >= 0) {
        if (cjk || (!/[\p{L}\p{N}_]/u.test(normalized[at - 1] ?? " ") && !/[\p{L}\p{N}_]/u.test(normalized[at + label.length] ?? " "))) return true;
        at = normalized.indexOf(label, at + 1);
      }
      return false;
    });
    if (found.length) evidence[c.id] = found.map(({ label }) => `explicit-text:${label}`);
  }
  return evidence;
}
function unit(input: DocumentInput, location: SourceLocation, text: string, format: string, formulas: Formula[], references: KnowledgeUnit["references"], errors: string[] = []): KnowledgeUnit {
  const evidence = resolveConcepts(text);
  // Identity follows source + structural locator; content changes invalidate revision, not identity.
  const locator = `${input.path}#${location.cell === undefined ? "" : `cell-${location.cell}:`}${location.startLine}`;
  return { schemaVersion: 1, id: `${input.sourceId}:${encodeURIComponent(locator)}`, sourceId: input.sourceId,
    origin: input.origin, revision: input.revision, contentHash: input.contentHash, location, format,
    language: /[\u3400-\u9fff]/.test(text) ? "zh" : "en", title: location.heading[location.heading.length - 1] ?? input.path,
    text, formulas, references, conceptIds: Object.keys(evidence), conceptEvidence: evidence, assumptions: [],
    rights: input.rights ?? "local-only", parseStatus: errors.length ? "partial" : "parsed", errors,
    disposition: "needs-review", reason: "Parsed source; mathematical model and file-level rights require review", modelIds: [], sceneIds: [] };
}
function markdown(input: DocumentInput, format: string, cell?: number): KnowledgeUnit[] {
  const tree = parser.parse(input.text) as Node;
  const out: KnowledgeUnit[] = []; let heading: string[] = []; let blocks: Node[] = [];
  function flush() {
    if (!blocks.length) return;
    const start = blocks[0].position!.start, end = blocks[blocks.length - 1].position!.end;
    const location: SourceLocation = { path: input.path, startLine: start.line, endLine: end.line, heading: [...heading], ...(cell === undefined ? {} : { cell }) };
    const formulas: Formula[] = [], references: KnowledgeUnit["references"] = [];
    function walk(n: Node) {
      if (n.type === "math" || n.type === "inlineMath") formulas.push({ expression: n.value!, evidence: "document-explicit", location: { ...location, startLine: n.position!.start.line, endLine: n.position!.end.line } });
      if (n.type === "link" || n.type === "image" || n.type === "definition") references.push({ target: n.url!, kind: n.type });
      if (n.type === "text" && n.value) {
        for (const link of n.value.matchAll(/(!?)\[\[([^\]\n]+)\]\]/g)) references.push({ target: link[2].split("|")[0], kind: link[1] ? "obsidian-embed" : "wikilink" });
      }
      // Code, raw HTML and YAML are retained as source only; never interpreted or executed.
      for (const child of n.children ?? []) walk(child);
    }
    for (const b of blocks) walk(b);
    const raw = input.text.slice(start.offset, end.offset);
    for (const ref of raw.matchAll(/\{(eq|ref|numref|doc)\}`([^`]+)`/g)) references.push({ target: ref[2], kind: `myst-${ref[1]}` });
    out.push(unit(input, location, raw, format, formulas, references,
      /(^|\n)\s*:::{|\{(?:math|code-cell|include)\}/.test(raw) ? ["MyST directives preserved; directive semantics require review"] : []));
    blocks = [];
  }
  for (const node of tree.children ?? []) {
    if (node.type === "heading") { flush(); heading = heading.slice(0, (node.depth ?? 1) - 1); heading.push(textOf(node)); }
    blocks.push(node);
  }
  flush();
  return out;
}
export function parseDocument(input: DocumentInput): KnowledgeUnit[] {
  if (input.text.length > 2_000_000) throw new Error("Document exceeds 2 MB character limit");
  if (input.text.includes("\0")) throw new Error("Binary content in text document");
  const ext = input.path.split(".").pop()!.toLowerCase();
  if (["md", "markdown", "mdown", "rmd"].includes(ext)) return markdown(input, ext === "rmd" ? "r-markdown" : /\[\[|^>\s*\[!/m.test(input.text) ? "obsidian-markdown" : /:::{|\{(?:ref|eq|math)\}/.test(input.text) ? "myst-markdown" : "commonmark");
  if (ext === "ipynb") {
    const notebook = JSON.parse(input.text);
    if (!Array.isArray(notebook.cells)) throw new Error("Invalid notebook cells");
    return notebook.cells.flatMap((c: { cell_type: string; source: string | string[] }, i: number) => {
      if (c.cell_type !== "markdown") return []; // No outputs, attachments, code, rich HTML or execution.
      const text = Array.isArray(c.source) ? c.source.join("") : c.source;
      if (typeof text !== "string") throw new Error(`Invalid notebook cell ${i}`);
      return markdown({ ...input, text }, "notebook-markdown", i);
    });
  }
  if (["html", "htm"].includes(ext)) {
    // parse5 is inert: no DOM, script execution, network, iframe or include expansion.
    const doc = parseHtml(input.text, { sourceCodeLocationInfo: true });
    const parts: { text: string; line: number }[] = []; const formulas: Formula[] = []; const refs: KnowledgeUnit["references"] = [];
    function walk(n: unknown) {
      const el = n as { nodeName: string; value?: string; attrs?: { name: string; value: string }[]; childNodes?: unknown[]; sourceCodeLocation?: { startLine: number; endLine: number; startOffset: number; endOffset: number } };
      const location = { path: input.path, startLine: el.sourceCodeLocation?.startLine ?? 1, endLine: el.sourceCodeLocation?.endLine ?? 1, heading: [] };
      if (el.nodeName === "script" && /^math\/tex(?:;|$)/i.test(el.attrs?.find(a => a.name === "type")?.value ?? "")) {
        const expression = (el.childNodes ?? []).map(c => (c as { value?: string }).value ?? "").join("");
        if (expression.trim()) formulas.push({ expression, location, representation: "tex", evidence: "document-explicit" });
        return;
      }
      if (el.nodeName === "math" && el.sourceCodeLocation) {
        formulas.push({ expression: input.text.slice(el.sourceCodeLocation.startOffset, el.sourceCodeLocation.endOffset), location, representation: "mathml", evidence: "document-explicit" });
        return;
      }
      if (["script", "style", "nav", "footer", "header", "template", "iframe", "noscript"].includes(el.nodeName)) return;
      if (el.nodeName === "#text" && el.value?.trim()) parts.push({ text: el.value.trim(), line: el.sourceCodeLocation?.startLine ?? 1 });
      if (el.nodeName === "a") { const href = el.attrs?.find(a => a.name === "href")?.value; if (href) refs.push({ target: href, kind: "link" }); }
      for (const child of el.childNodes ?? []) walk(child);
    }
    walk(doc);
    const text = parts.map(p => p.text).join("\n");
    const loc = { path: input.path, startLine: 1, endLine: input.text.split("\n").length, heading: [] };
    for (const part of parts) {
      for (const m of part.text.matchAll(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<!\\)\$(?!\$)([^\n$]+)\$/g)) {
        const line = part.line + part.text.slice(0, m.index).split("\n").length - 1;
        formulas.push({ expression: m[1] ?? m[2] ?? m[3] ?? m[4], location: { ...loc, startLine: line, endLine: line + m[0].split("\n").length - 1 }, representation: "tex", evidence: "document-explicit" });
      }
    }
    return text ? [unit(input, loc, text, "html", formulas.filter(f => f.expression), refs, ["HTML text extracted; interactive/script mathematics and MathML require review"])] : [];
  }
  if (ext === "tex") {
    // Static extraction only: TeX macros, input/include, shell escapes are never evaluated.
    const lines = input.text.split("\n"), formulas: Formula[] = [], refs: KnowledgeUnit["references"] = [];
    for (const m of input.text.matchAll(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\begin\{(equation\*?|align\*?|gather\*?)\}([\s\S]*?)\\end\{\3\}|(?<!\\)\$(?!\$)([^\n$]+)\$/g)) {
      const line = input.text.slice(0, m.index).split("\n").length;
      formulas.push({ expression: m[1] ?? m[2] ?? m[4] ?? m[5], evidence: "document-explicit", location: { path: input.path, startLine: line, endLine: line + m[0].split("\n").length - 1, heading: [] } });
    }
    for (const m of input.text.matchAll(/\\(input|include|cite|ref|eqref|label)\{([^}]+)\}/g)) refs.push({ target: m[2], kind: `latex-${m[1]}` });
    return [unit(input, { path: input.path, startLine: 1, endLine: lines.length, heading: [] }, input.text, "latex", formulas, refs, ["Static TeX extraction; macros, includes and compilation are not evaluated"] )];
  }
  return [];
}
