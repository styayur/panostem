# Dependency and architecture decisions — 2026-10-26

Each reference was checked through repository metadata, immutable commit/tree,
README/license and, where applicable, actual implementation modules. Exact SHAs,
paths and hashes are in [reference-review.json](reference-review.json). Raw
third-party sources remain in the ignored local audit, not the application.

| Project | Reviewed architecture/interface | License evidence | ManimGL relation | Decision/runtime dependency |
| --- | --- | --- | --- | --- |
| remarkjs/remark | `remark-parse/lib/index.js`: mdast `fromMarkdown` and extension data | MIT text | Independent of rendering | Adopt unified/remark parser, GFM/math/frontmatter AST extensions; no service |
| jupyter-book/mystmd | `myst-parser` index/math plugins and AST transform architecture | MIT text | Independent | Preserve MyST constructs as partial; defer full directive semantics and cross-document execution |
| executablebooks/MyST-Parser | `create_md_parser`, Sphinx/docutils bridges | MIT text | Independent | Reference only; no permanent Python parser service |
| microsoft/markitdown | Converter registry, stream conversion, optional format/plugin backends | MIT text | Independent | Reference only; binary/OCR parsing remains separately gated; do not install all converters |
| PKM-er/Pkmer-Math | Actual imported Markdown/WikiLinks/frontmatter/formulas | No repository license grant established | Source evidence only | Private index/external citations; no source-body redistribution |
| benmaster82/Kwipu | `bridge/graph.py`, typed models, defensive locked graph snapshots; llama-index import | MIT text | Independent | Borrow provenance/locking ideas; no llama-index or model-service runtime |
| AmirhosseinHonardoust/Graph-RAG-Engine | NetworkX typed Doc/Chunk/Concept nodes and `HAS_CHUNK`/`MENTIONS` edges | MIT text | Independent | Reuse relationship distinctions, keep authoritative Concept IDs; no competing provider/RAG service |
| mathigon/textbooks | `linear-functions/functions.ts`: Step state, function chart and drag interaction | No license file returned by repository license endpoint | Interactive teaching reference | Reference only; no Mathigon content/assets/code copied |
| sympy/sympy | ODE solver/classification and symbolic identity interfaces | BSD-style license text, including redistribution conditions | Verification separate from renderer | Use already locked managed runtime for independent math tests; no frontend dependency |
| djeada/Numerical-Methods | Actual source notes: Newton, bisection, ODE/PDE assumptions, convergence and invariants | MIT text | Models independently reconstructed | Source-grounded reviewed recipes; original images/scripts are not bundled |
| 3b1b/manim | Upstream Scene/renderer interfaces plus actual locked runtime | MIT text | Native ManimGL | Retain pinned runtime `f427fc67df75513be0cd3f3329e327a9a19401c3`; no CE substitution or upgrade to moving HEAD |
| jeertmans/manim-slides | `slide/manimlib.py`: Scene subclass, file-writer subdivision, partial movies and camera methods | MIT text | Explicit ManimGL adapter exists | Actual pinned runtime exposes the inspected camera/Scene interfaces, but full adapter rendering is unverified; do not add runtime dependency or claim compatibility |
| ManimCommunity/manim_editor | Project/section JSON schemas | MIT text | Primarily CE ecosystem | Schema/reference ideas only; no untested renderer integration |
| Matheart/manim-physics | `electrostatics.py` imports `manim`, CE mobjects/vector fields | MIT text | CE imports are incompatible with direct ManimGL use | Algorithm reference only; no CE dependency or direct plugin loading |

The installed npm graph and actual notices are refreshed under `licenses/`.
`remark-frontmatter → fault → format@0.2.2` includes an obsolete ES3 global probe.
The Vite transform verifies the exact version/probe and substitutes `globalThis`;
the existing production executable-AST test still prohibits eval/Function calls.
`remark-math`'s transitive KaTeX is overridden to the application's patched KaTeX
version. The final npm audit reports zero vulnerabilities. No test threshold or
CodeForge baseline was lowered.

`format` declares MIT in the historical `licenses` array, which the collector now
recognizes. Its package links to the author's MIT grant; the retrieved grant and
original release copyright notice are preserved with hashes. `remark-math` omits
its monorepo license from the npm archive; the exact 6.0.0 tag's license is supplied
under supplemental notices. Existing supplemental notices remain intact.
