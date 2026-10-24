# Architecture

Panostem is a concept-driven STEM learning environment with an independent native ManimGL authoring engine. External WebViewers remain supporting resource viewers with restricted IPC.

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
[migration notes](migration-panostem.md) for contracts and known limitations.

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

## v0.3 retrieval and snapshot contract

The canonical ontology also backs glossary translation. Rust and TypeScript consume the same ontology, benchmark labels and golden contract. Candidate retrieval is strict AND across concept groups; graph exploration is explicitly opt-in. Search explanations and the shared diagnostic presenter make zero results distinguishable from failed/disabled providers and filters. See [retrieval.md](retrieval.md).

Index schema/cache version 2 adds deterministic semantic metadata with field provenance. Web content-hash cache keys prevent same-date stale snapshots; desktop invalidates old schema caches and rebuilds without fatal deserialization. A staged weekly/manual refresh rejects provider-count/URL/title/duplicate/semantic regressions before creating a PR. CI compares the old and new engines on the same baseline corpus as well as the refreshed corpus. No cloud service, telemetry, IPC capability or embedding bypass was added.
