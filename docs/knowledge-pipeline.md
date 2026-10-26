# Source-grounded knowledge pipeline

This implements the first Vextessera engineering stage on the existing Panostem
application. Product and repository renaming remain gated by the later migration
and release work. The application remains AGPL-3.0-only.

## Read-only ingestion

The Knowledge page reads user-selected files/directories on the device. The index
is session-local and can be cleared or undone. Source text is rendered as escaped
text, never HTML or executable code. It is not sent to translation, telemetry or
an AI service. A reload clears the session. Imported concepts link to the existing
Workbench, and local matches appear beside the existing search results.

For a durable private index outside the source directory:

```powershell
npm run knowledge:ingest -- --root 'D:\Notes\Science' --source local:science --out 'D:\PrivateIndexes\science.json'
```

An existing Git clone is also a supported directory. Git metadata is read without
checkout, hooks, dependency installation, Notebook execution or build commands.
The adapter never follows symlinks/junctions; rejects outside-root reads, invalid
UTF-8, binary text and oversized files; ignores dependency and editor directories;
and records errors independently. The current limit is 2 MB per document. The UI
additionally limits a selection to 5,000 files/64 MB. The CLI saves one prior index
generation as `.previous.json`; reindexing reconciles deleted sections/files.
These are filesystem safeguards, not an OS sandbox against a malicious process
concurrently changing the source tree.

## Format boundaries

| Format | Implemented | Deliberate boundary |
| --- | --- | --- |
| CommonMark/GFM | remark AST, headings, positions, links, math | No code execution |
| Obsidian | WikiLinks, aliases, embeds and callout source | No embed expansion; no Vault changes |
| MyST | Preserve directive/cross-reference source | Directive semantics require review; no include execution |
| TeX | Static math environments and references | No macro expansion, compilation or shell escape |
| R Markdown | Markdown/math outside executable chunks | No R execution |
| Notebook | Markdown cells and cell/line locators | No code, outputs, HTML attachments or dependency execution |
| HTML | parse5, inline math, inert MathJax TeX and raw MathML | No scripts/iframes; JavaScript shells are not knowledge bodies |
| PDF/images/slides | Explicit unsupported/manual-review records | No blanket Markdown conversion or redistribution grant |

Canonical Concept IDs come from `src/lib/concepts.json` (494 at the audited
baseline). Label matching is explicit-text evidence, not proof that a complete
mathematical model has been understood. The importer never adds ontology entries.
Unit IDs are source/path/structural-line locators; content hashes and immutable
revision metadata detect changes. A shifted or missing locator invalidates an
association and requires reindexing/review rather than silently reusing a scene.

## Models and visualization

`KnowledgeUnit`, `MathematicalModel`, `VisualizationIntent` and
`VisualKnowledgeRegistry` are versioned TypeScript contracts. The model records
variables/domains/units, parameters, equations, initial/boundary conditions,
assumptions, solver, invariants and source evidence. Evidence distinguishes
explicit statements, derivations, inference and unverified claims. Intents select
ordinary ManimGL producers; they do not restrict Python scene authoring.

Fourteen application-owned recipes currently have independent symbolic, analytic
or numerical checks and actual ManimGL/FFmpeg evidence. They include a 3D gradient
surface, ODE/PDE time evolution, complex maps, linear transforms, root finding and
probability, electrostatics, reviewed beam/FEM convergence and an explicitly
authored filtered PID model. Each has ordinary `main.py`, a custom `helpers.py`, `scene.json`,
`model.json`, `intent.json`, captured project revision and media. Binding scope is
the listed equation/derived example, not verification of every claim in a source.
Unknown models remain in a review/modeling queue. Render success alone never
grants mathematical validity or redistribution rights.

The scene registry requires math/render/decode evidence and exact source hashes.
It reuses only a matching semantic model key/version. Changes in any bound source
invalidate reuse. The existing free Studio, project/share format, execution
consent, Python API and Web prohibition on Python remain in force.

## Reproducible corpus commands

The following commands write raw bodies, cloned-source indexes, caches and media
under the ignored `.panostem-runtime` directory. Do not commit private indexes.
Network and execution are separate explicit CLI options.

```powershell
npm run knowledge:census -- --allow-network --vault 'D:\Docs\Obsidian Vault'
$env:SVE_INDEX_OUT='.panostem-runtime/vextessera-corpus/live-index'
cargo run --locked --no-default-features --manifest-path src-tauri/Cargo.toml --example dump_web_index
node scripts/enrich_index.mjs
node scripts/knowledge/web-content.mjs --allow-network
.panostem-runtime/venv/Scripts/python.exe scripts/knowledge/sampling.py --allow-execution
npm run knowledge:batch
node scripts/knowledge/report.mjs
```

The corpus exporter uses the existing `ProviderRegistry`, manifest and search
contracts. Math Insight pagination is bounded to the listing endpoint/origin and
fails rather than silently accepting a truncated traversal. Navigation controls
are excluded. BetterExplained relative article URLs are normalized and foreign
hosts rejected. The existing quality/recall gates are retained.

Web content respects robots rules, limits redirects/bytes/time, stops requests
on 403/429, and uses a per-host delay. External hosts listed by a provider need
their own access/rights review; they are recorded without being followed. Videos
are linked without download/transcription. Cache reparse uses content hashes;
`--retry-failed` retries actual failures without bypassing access restrictions.

The batch command supports `--source`, `--subject`, `--concept`, `--type`,
`--status`, `--concurrency` (1–8), `--timeout` (milliseconds), `--public`, and
`--retry` (recompute cached dispositions). It writes per-source atomic checkpoints,
a detailed private ledger, and JSON/Markdown summaries. `--render-reviewed
--allow-execution` also runs only application-owned reviewed recipes with the
managed Python; it never turns imported code into a runnable scene. Ctrl+C keeps
completed checkpoints. A missing/unsupported/restricted resource never becomes a
successful render. `not-yet-processed` remains visible for filtered/cancelled runs.

## Current evidence and limits

See [the census](audits/vextessera/source-census.json),
[frozen evaluations](audits/vextessera/frozen-samples.json),
[rendered samples](audits/vextessera/rendered-samples.json) and
[dependency decisions](audits/vextessera/dependency-decisions.md).
The reports separate source, file, unit, scene and publicly distributable media
counts. A classified queue is not a completed visualization corpus. Website-wide
discovery beyond linked ProviderRegistry endpoints is not proven; many per-source
model/render requirements remain queued. A manually reviewed beam PDF unit does
not establish general PDF parsing. The control plant and law are authored
assumptions, not attributed to unavailable control repositories. No Vextessera release success is claimed by this stage.

## Model reader and ordinary Studio templates

Search and the Knowledge workspace expose fourteen reviewed model contracts,
immutable source locators, units, assumptions, parameters and verification results.
Six cleared, self-rendered movies and source share packages are available in Web;
the other eight models explicitly require local generation. The native Studio
selector creates the same ordinary multi-file Python project without executing
it. Running still requires trust in that exact captured revision. Source/helper,
catalog, media and share hashes are checked against the generated packages and
embedded build identity.

After source sampling, run `node scripts/knowledge/package_models.mjs` to create
the verified catalog and distributable packages. It reads captured `.execution`
bytes, validates the project revision and re-decodes the actual copied media.
`model_smoke.py` independently verifies and renders all bundled templates.
`reviewed-model-samples-v2.json` extends the immutable original eleven-entry freeze
to fourteen; both are retained in the audit directory.
