# Architecture

Vextessera is a concept-driven STEM learning environment with an independent native ManimGL authoring engine. External WebViewers remain supporting resource viewers with restricted IPC.

## ManimGL architecture

The existing ontology, learning profiles, mathematical state machine, numeric
SceneFrame/ScenePrimitive validation and JSXGraph renderer remain intact.
`src/studio` adds a lazy-loaded project/editor/task/share surface. The optional
metadata registry validates existing Concept IDs rather than adding a resolver.
`src-tauri/src/studio.rs` owns the application runtime, explicit installation,
bounded process tasks, cancellation and scoped media tokens. Bundled Python
controllers under `src-tauri/runtime` inspect/save/archive projects without
importing them, and execute trusted scenes through the immutable upstream CLI.
Preview is a separate OpenGL window. Video/frame results are served through a
random-token protocol limited to app windows; external viewers have no access.
Web only validates/imports packages and plays media. See
[ADR 0005](adr/0005-panostem-manimgl.md), [runtime guide](manimgl.md) and
[migration notes](migration-vextessera.md) for contracts and known limitations.

## Core domain

- Resolve multilingual STEM queries into stable concepts, AND groups, and Direct/Equivalent/Exploratory variants.
- Search enabled providers concurrently and merge results into one normalized shape.
- Match safe word boundaries and score separate title, semantic annotation, tag and description evidence. URLs do not participate in lexical recall.
- Support favorites, history, preview selection, and bounded four-pane comparison.
- Keep search, provider, and ranking policy shared between desktop and web where practical.

## UI boundary

React owns search state, filters, result presentation, workspaces, keyboard interaction, and preview selection. Provider-specific parsing does not belong in UI components. Web and desktop may differ in storage and window capabilities, but the search contract remains shared.

## Provider boundary

Each source implements `SearchProvider` and returns normalized `SearchResult` values. Providers own source-specific fetching/parsing and declare experimental status, index metadata, and PreviewCapability. See [provider-extension.md](provider-extension.md).

## Preview and WebViewer boundary

`src/lib/previewCapabilities.json` is the conservative source-host policy shared by Rust and the browser. WebViewer is a supporting inspection surface for a selected result, not a tabbed browser or an embedding-policy bypass. CSP and X-Frame-Options remain authoritative.

## Persistence boundary

Favorites, history, settings, and desktop indexes are local. The web build uses browser storage and a published index snapshot; the desktop build uses local files/SQLite and provider refreshes. No account, cloud database, or telemetry service is required.

## External service boundary

Network requests go directly from the user's machine to source providers. Translation is opt-in and sends only selected text to the configured translation service. External pages are never granted application IPC.

## Extension points

- New providers must add parser fixtures, registry metadata, an explicit host policy, and preview capability.
- Ranking changes require shared-language regressions and concept/weight tests.
- New preview behavior must preserve URL validation and embedding policy.
- New persistence fields require migration/default handling and web/desktop parity notes.

## Release boundary

Desktop releases use `vX.Y.Z` tags, exact-source validation, Windows build checks, stable portable/installer names, and `SHA256SUMS.txt`. The GitHub Pages build is generated from the same source and deployed separately. Maintainers own tagging and publication.

Alpha.2 shares one [design-token layer](design-system.md) across shell, Workbench,
lessons and Studio. It preserves ontology/mathematics and storage contracts.
Preview destinations require exact provider identity and safe normalized HTTP(S)
URLs. Falstad iframe URLs are rebuilt from a static HTTPS origin using only parsed
path/query/fragment setters. Web and native parent `frame-src` CSP restrict frame
navigation, including redirects, to the approved Falstad origins. External viewer
windows remain separate and receive no app/media IPC.

Studio's revision scheme 2 uses a canonical path/hash manifest. Run authorization
is checked against the complete captured tree before launching the normal engine;
the capture becomes its cwd. Reviewed requirements are compiled from a separate
temporary copy. Share source is verified against the run's captured manifest.
These controls close ordinary authorization/content races, not the OS permissions
of expressly trusted Python. See [ADR 0006](adr/0006-engineering-ui-hardening.md).

The [release checklist](release-checklist.md) separates real native/render/installer
evidence from contracts. The workflow refuses existing releases and requires the
tagged merged source's CI, CodeForge and four-language CodeQL results. Experimental
platforms and unsigned packages must be identified explicitly.

## v0.3 retrieval and snapshot contract

The canonical ontology also backs glossary translation. Rust and TypeScript consume the same ontology, benchmark labels and golden contract. Candidate retrieval is strict AND across concept groups; graph exploration is explicitly opt-in. Search explanations and the shared diagnostic presenter make zero results distinguishable from failed/disabled providers and filters. See [retrieval.md](retrieval.md).

Index schema/cache version 2 adds deterministic semantic metadata with field provenance. Web content-hash cache keys prevent same-date stale snapshots; desktop invalidates old schema caches and rebuilds without fatal deserialization. A staged weekly/manual refresh rejects provider-count/URL/title/duplicate/semantic regressions before creating a PR. CI compares the old and new engines on the same baseline corpus as well as the refreshed corpus. No cloud service, telemetry, IPC capability or embedding bypass was added.

## Source-grounded model pipeline

The read-only `KnowledgeSourceAdapter` feeds versioned units with exact source
positions, content hashes, formulas, references and authoritative Concept IDs.
Web discovery remains in `ProviderRegistry`; the census does not introduce a
competing search provider architecture. Static parsing never executes imported
Notebook, Rmd, HTML or repository code. Private bodies/indexes stay outside public
artifacts.

Reviewed `MathematicalModel` and `VisualizationIntent` contracts bind equations,
units, assumptions, conditions and verification to ordinary ManimGL producers.
The registry requires matching source hashes plus independent math, actual render
and decode evidence. Batch classification is checkpointed and separate from
scene/render completion. Source changes invalidate bindings rather than silently
reusing evidence.

`ModelWorkbench` connects search/Concept Workbench with citations, contracts,
selected public movies/source shares and fourteen native templates. The native
controller creates a normal project without executing it; revision trust governs
subsequent runs. The build embeds exact catalog/helper/template hashes. Web has
no Python executor. See [pipeline and scope](knowledge-pipeline.md).
