# Vextessera engineering delivery status

This is a staged implementation record, not a Vextessera release announcement.
Counts come from the machine-readable reports generated on 2026-10-26.

## Baseline and governance

- Local checkout: `stem-visual-explorer`, origin `styayur/panostem`, clean `main`
  at `bce6e55198d59fef4ace05162f2114fcedf53f3f` before this work.
- No repository `AGENTS.md` was found. The authority contains **494 concepts**;
  no ontology records or historical IDs were changed.
- Active Ruleset `24222263` requires a PR and Frontend, Windows compile, Rust
  core and CodeForge checks. It has no bypass actors; the current account cannot
  bypass it. CodeQL default setup and Dependabot configuration were read.
- Existing unrelated PRs #21/#29/#30/#31/#34 were inspected and left alone.
- `styayur/vextessera` and tag `v0.6.0-alpha.1` returned 404 during the audit.
  This is an availability observation, not a reservation or rename.
- Existing `v0.5.0-alpha.1`, `v0.5.0-alpha.2`, earlier tags and release assets
  have not been changed. Tauri `org.stemvisualexplorer.app`, SQLite locations,
  `sve.*`, Studio storage keys, project format and share identifiers remain intact.

## Implemented and measured

All 22 registered sources have a disposition record. Twelve verified local Git
clones were read without changing the Vault. The three unavailable repository
identities remain unavailable; no substitute repositories were invented. The
existing ProviderRegistry now discovers 1,555 valid website resources. The initial
1,578 candidate count contained 23 pagination controls, removed after review.

The corpus ledger contains 18,402 file/resource records, 3,659 parsed documents and
13,977 knowledge units. It distinguishes **12 visualized**, **4 reused**, **5,765
needs-modeling** and **8,196 needs-review** units. No discovered unit is silently
omitted; `not-yet-processed` is zero for this completed classification run. That
does not mean the modeling or rendering queues are completed.

File/resource dispositions separately include 14,641 unsupported records, 101
access/rights restrictions and one unavailable URL. Unsupported PDFs, images,
code and JavaScript shells are not counted as parsed knowledge. The 20 Falstad
outbound-host refusals were originally recorded as failures, then correctly
classified as requiring separate source/access/rights review. No restriction was
bypassed. Unlinked/site-wide resource completeness remains unproven.

Fourteen reviewed model recipes were generated, independently verified, rendered
with pinned ManimGL and decoded with FFmpeg, yielding 16 source-unit associations.
The same frozen source hashes were replayed. An intermediate replay failed all
11 render jobs because it reused immutable output directory names; this failure
was retained, the job-ID policy fixed, and all 11 rerun successfully. 3D title
placement and mathematical/unit metadata were also refined. Source hash checks
are retained for every association. These verify listed equations and derived
examples, not every assertion in a long source document.

The original five-scene runtime regression also rendered and decoded again,
including multi-file/custom classes, 3D, updaters, GIF/MOV/PNG and captured-source
behavior. This independent runtime evidence is not added to source coverage.

## Verified engineering checks

- Existing search/golden/ontology, learning, Workbench and Studio suites passed;
  the 1,395 language queries and exact 51-case TS/Rust parity gates passed.
- New ingestion suites cover AST/source locations, WikiLinks, MyST/TeX boundaries,
  Rmd/Notebook non-execution, HTML MathJax/MathML, unsafe paths/encoding/size,
  registry freshness, batch recovery/filtering and redistribution policy.
- Real Chromium: local file reads, escaped script source, formula/location display,
  concept round trip, clear/undo, no private network/translation requests, three
  languages, Reduced Motion and 390/768/1440px passed.
- Existing Web suite: 23 groups plus Workbench/Studio/lesson/preview security and
  18 design locale/theme/viewport combinations passed. Production Pages build
  passed executable-AST prohibition and numeric-only JSXGraph provenance.
- Windows Tauri compile, Rust formatting/core Clippy and 44 Rust tests passed;
  25 Python runtime contracts passed. npm audit reports zero vulnerabilities.
- CodeForge v0.2.1 local changed-code gate passed with no new SARIF findings. Its
  configured build/test runner is unavailable on this Windows invocation; those
  commands were independently run, and hosted CI remains the merge authority.

PR [#38](https://github.com/styayur/panostem/pull/38) passed all hosted checks,
including CodeQL, CodeForge and real OpenGL rendering, and merged through the
protected ruleset at `f4512e16c44d038b34fe2aae0b97c059aa4f309d`.
The model-workbench follow-up still requires its own protected PR and checks.

## Remaining work and publication gate

| Stage | State |
| --- | --- |
| Source/format ingestion and reproducible census | Implemented, with explicit binary/dynamic/rights limits |
| Mathematical model, intent and registry contracts | Implemented; fourteen independently checked producers |
| Required full per-source stratified modeling/render evaluation | **Incomplete**; frozen plans are retained, many samples need modeling/review |
| Full discovered-corpus classification and recovery | Implemented; site-wide discovery and actual visualization coverage remain incomplete |
| Local knowledge/search/Concept Workbench connection | Implemented; model reader, source/validation details, six Web movies/share packages, fourteen native Studio templates |
| Vextessera branding and upgrade migration | **Not yet performed**; gated after the main feature and compatibility work |
| Windows build/package/release and new Pages migration | **Not yet performed** for v0.6.0-alpha.1 |

Six independently authored model movies and ordinary source share packages are
cleared with the checked MIT djeada attribution; no original source body, image,
PDF, animation code or restricted media is included. Other eight models support
local generation only. HITSZ's actual LICENSE is CC BY-NC-SA 4.0. Tsinghua's root
LICENSE is CC BY-SA 4.0 while a README link points to NC-SA; third-party course
material remains separately restricted. TheFEAMan's LICENSE is Apache-2.0 despite
its README saying MIT; textbook scans do not inherit a blanket grant. Several
other repositories have no established license grant. PhET HTML shells neither
expose a mathematical model nor establish media rights.

The beam PDF's extracted text scrambled formulas. Its actual rendered page was
visually reviewed; one exact-hash page-1/row-3 equation unit was added through an
explicit review sidecar. The finite-element scene checks symbolically derived
Hermite stiffness/load, boundary conditions, analytical deflection and mesh
convergence. This is a reviewed exception, not general PDF parsing. Electric-field
verification checks the actual source's inverse-square equation against the
potential gradient. The filtered PID example is an application-authored plant and
controller; djeada is cited only for first-order-state methodology. It does not
restore the three unavailable source repositories.

The original eleven-entry reviewed freeze remains unchanged. A version-two freeze
adds beam, electric and control without replacing any original source hash. All
fourteen source projects and all fourteen embedded templates rendered and decoded
successfully. Source-to-model-to-Studio navigation, non-executing project creation,
revision trust, native rendering and media playback are exercised separately.

Per-source modeling/render coverage and global website discovery remain
incomplete, with explicit queues and reproducible reasons. `releaseReady:false`
in the corpus report means full-corpus visualization readiness; it is not a claim
that every queued model must be completed before an accurately scoped architecture
alpha can be reviewed. Branding and publication require their own compatibility,
protected CI, binary identity and actual deployment evidence.

WindowsSandbox/vmrun/VBoxManage were absent; a clean/old-to-new installer lifecycle
was not run in the user's primary profile. Build success is not upgrade evidence.
No signing, updater, OS Python sandbox, or formal Linux/macOS support is claimed.

The full private ledger, raw evidence, generated projects and decoded media are
under `.panostem-runtime/vextessera-corpus/`. Public JSON reports contain only
registered-source metadata, aggregate decisions and reviewed mathematical evidence.
