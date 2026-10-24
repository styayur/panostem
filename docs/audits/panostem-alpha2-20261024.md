# Panostem alpha.2 engineering and release audit — 2026-10-24

## Status and source

This is the new alpha.2 audit, separate from the immutable alpha.1 publication
record. At implementation review, publication is pending protected PR/merge,
exact-source checks and asset verification. The post-publication appendix will
record actual identifiers/results; this section does not claim a planned release
has already shipped.

Verified baseline: main `7eba670619587842b25ab15b544d421035501c0e`, alpha.1 tag
`cad3dd2e0da378794278b5436fbdeeb62389be2e`. Work started from a clean existing
checkout on `feat/panostem-engineering-ui-hardening`, remote
`https://github.com/styayur/panostem.git`. Main's active ruleset requires a PR,
squash merge and Frontend/Windows/Core/CodeForge checks; no bypass was used.
Unrelated open PRs were left alone. Product version sources target **0.5.0-alpha.2**;
the production identifier remains `org.stemvisualexplorer.app`.

The request called the ontology “490 concepts”; actual baseline and current JSON
both contain **494** records, byte-identical SHA-256
`1790962c2aa508d3ef3eaa41e3a45d0e0e0f6b1d1848c5facb03ccc44d680585`.
No ontology, index data, scientific renderer/model or storage identity was changed.
The public README count was corrected to the actual data instead of deleting records.

## Interface

Shared neutral/teal light/dark tokens now feed Tailwind, shell, search/results,
source filters, previews/Quick Look, favorites/settings, Workbench/lessons, command
palette and Studio. No UI/font dependency was added. Technical titles/data replace
decorative empty-state presentation; narrow sources expand inline. The native
editor is the principal surface, with bounded file/run panels and adjacent
playback/tasks below, readable status and resizable logs. File trash/output removal
have explicit confirmation; source opt-in resets on project/output changes.
Three UI languages, skip/focus/dialog behavior and system editor theme are retained.
See [design system](../design-system.md), [ADR 0006](../adr/0006-engineering-ui-hardening.md)
and [genuine before/after evidence](../ui-alpha2/README.md).

The 18-combination browser check covers EN/简体/繁體 × light/dark × 1440×900,
1280×800 and 390×844, horizontal overflow, text-token contrast ≥4.5:1 on neutral
surfaces, source-toggle Escape/focus, dialog Tab cycles, visible focus and Reduced
Motion. Existing lesson/Workbench suites retain their mathematical and keyboard
assertions. These focused checks are not an exhaustive accessibility certification.

## Confirmed trust defect and correction

The previous fingerprint concatenated filename bytes and content without framing.
A harmless local reproduction moved `b.pyMARKER = 1` out of an `a.py` comment into
a new `b.py`; the concatenated hash input stayed identical. A new regression was
observed failing before the fix. This was treated as a release blocker.

Revision scheme 2 now hashes canonical JSON containing sorted relative paths and
per-file SHA-256. One file read supplies its fingerprint and AST/metadata parsing.
Modules, assets, configuration, requirements and additions/deletions are included.
Before engine launch, reviewed files are copied to a separate `.execution` tree
and the entire captured revision is compared. ManimGL then uses that captured cwd
and entry with its normal CLI. Mutation during capture rejects and removes the
stage; later editor changes cannot replace captured local modules. Requirements
are independently captured/hashed and compiled from a private temporary copy.

Real-engine race evidence: a running scene signalled readiness, the parent changed
editable `helpers.py` from 42 to 999, and the scene's delayed import still produced
**42** from the capture. The resulting MP4 decoded with real FFmpeg. A private PNG
in the capture was excluded from the output-media inventory. Unit regressions cover
the collision, file kinds/add/delete, capture-time mutation, non-executing inspection,
requirements races and captured-source tampering/traversal. Source sharing reads
the captured file and verifies its hash; old outputs need a new render for source
attestation. Retry uses the selected task's in-session request and current grant. File load/save
operations keep the editor read-only until completion, preventing pending reads
from overwriting newly accepted input. The native suite verifies the exact saved
text and captured run source, not merely that a save button was clicked.

The capture closes ordinary editor/content races, not arbitrary same-user OS code.
Trusted Python, installed packages and absolute/external imports keep user filesystem,
network and system permissions. Venv/AST/process groups/Job Objects are not sandboxes.
The documented original-project/output/execution environment paths permit deliberate
writes. Private captures remain in render directories until output deletion and
consume the existing render budget; they are not automatically shared.

## Preview / CodeQL #4

The actual open alert was read from GitHub: rule
`js/client-side-unvalidated-url-redirection`, ResourcePreview.tsx old line 24,
Workspace `items` → `getWorkspaceResources` → ResourcePreview → iframe `src`.
Review covered scheme/hostname/source matching, credentials, ports, malformed URLs,
suffix/backslash/control ambiguity, sandbox and final iframe behavior.

Alpha.2 rejects credentials/nondefault ports/ambiguous raw characters, validates
exact provider identity, and rebuilds Falstad's destination from the static
`https://www.falstad.com/` origin using parsed path/query/fragment setters. Approved
HTTP resources upgrade to HTTPS for embedding. Web meta and native parent CSP
restrict `frame-src` to the two approved Falstad origins. Existing iframe sandbox,
no-referrer policy and external-viewer IPC denial remain.

URL unit tests cover accepted/rejected cases. A real Chromium regression enters
through the alert's actual Workspace query-payload path, checks cards versus frames,
the static origin/sandbox, and observes parent CSP violations blocking both server
302 and script navigation to an unapproved origin before its request. External
pages are fixtures; app code and payload handling are real. Alert closure/disposition
after default-branch analysis is recorded in the publication appendix; a green
workflow alone is not presented as alert resolution.

## Dependencies and target readiness

Clean `npm ci` installed 225 packages (226 audited), zero vulnerabilities.
`npm ls postcss-selector-parser --all` and `npm explain` resolve **only 7.1.7**,
deduplicated through Tailwind 3.4.19 and postcss-nested 6.2.0 under the existing
override. The sole npm lockfile has no old instance; the other tracked locks are
Cargo.lock and Python requirements.lock. No dependency version/override was changed
for this task beyond the application's own release version.

GitHub Dependabot #3 still attributed old 6.1.4 to package-lock.json, while GitHub's
own dependency-graph SBOM returned `pkg:npm/postcss-selector-parser@7.1.7`.
[GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) affects
<7.1.6. On 2026-10-24T07:17:43Z, #3 was **dismissed as inaccurate**, with that
local/platform graph evidence. This is an explicit stale-alert disposition, not a
claim that npm audit automatically fixed the platform. Reopen if a vulnerable
instance returns. Dependabot #4 (source-map-js) was already fixed.

Dependabot #1 remains open: **glib 0.18.5**, GTK3/WebKit/Tauri Linux chain.
[RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429.html) covers
`VariantStrIter::{next,next_back,nth,nth_back,last}` for >=0.15,<0.20. `impl_get`
passed immutable `&p` to variadic C `g_variant_get_child`, which writes the output
pointer; optimized builds may disregard that write and pass NULL to CStr::from_ptr.
[Upstream PR 1343](https://github.com/gtk-rs/gtk-rs-core/pull/1343) fixes it with
`&mut p`; the advisory's patched line is >=0.20. Actual `cargo tree --locked`
for Windows MSVC and macOS aarch64 has no glib; Linux includes 0.18.5 through
Tauri 2.12.3 → GTK 0.18.2 / WebKit2GTK 2.0.2 and related crates. Even current
Tauri 2.12.5's published manifest still requires GTK ^0.18. A compatible supported
upgrade to the glib 0.20 type family was not established. No unsafe semver override
or vendored safety patch was invented. Linux stays experimental with this blocker;
macOS separately lacks native release validation. Only Windows x64 is published.

## Windows installer and isolation

The historical v0.2.0 installer was actually downloaded: **2,706,461 bytes**,
SHA-256 `f756f65a868486230e4a24d29e3d405a2fb2facc53bdaa737151c2de3923b919`,
matching its published manifest/GitHub digest. Read-only 7-Zip inspection recognized
NSIS and `stem-visual-explorer.exe`; it was not installed into the primary profile.
Old tag config says productName STEM Visual Explorer and the same bundle identifier.

Source review of the [Tauri CLI 2.12.2 NSIS template](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.12.2/crates/tauri-bundler/src/bundle/windows/nsis/installer.nsi)
confirms product-name registration/install/shortcut identities and optional bundle-ID
app-data deletion. Alpha.2 explicitly selects currentUser. Cross-name registration
differs despite shared data identity: use the documented **uninstall-before-install,
preserve app data/external projects** procedure, not an assumed automatic upgrade.
See [migration guide](../migration-panostem.md).

Host: Windows 11 Home Chinese, SKU 99, medium integrity, Administrators deny-only.
WindowsSandbox.exe, qemu/VBox/vmrun/Get-VM and a safe disposable-profile runner or
credentials were unavailable. Therefore clean installer install, v0.2.0→alpha.2
upgrade, installed launch/data/registry/shortcuts, uninstall/reinstall, external
project preservation and failure recovery are **UNAVAILABLE / NOT VERIFIED**.
The audit app identifier isolates application data for native tests; it is not a
disposable Windows profile. APPDATA redirection and .wsb export are not VM evidence.
No installer lifecycle, sandbox guest/GPU or signed-package claim is made.

## Local verification

| Check | Observed result |
| --- | --- |
| Clean install / npm graph / audit | Pass; patched graph and zero npm vulnerabilities |
| Typecheck / Studio ESLint / desktop frontend build | Pass |
| Unit / language / golden / index baseline | 36 unit, 1,395 language resolutions, 51 golden; pass |
| Learning / Workbench / Studio contracts | 12 learning groups and all existing boundary/state/share contracts pass |
| Python | 24 tests pass (all original 17 assertions/tests retained) |
| Rust | fmt, 41 pure tests, pure and full native Clippy `-D warnings` pass |
| Chromium | 23 original groups, lessons' 24 states × 3 languages, Workbench, Studio, new redirect and 18-combination design checks pass |
| Production Pages | Actual subpath build/search/index/workspace/lessons/player pass; numeric-only bundle audit pass |
| WebView2 | 7 actual native groups pass, including SQLite, viewers/workspaces and denied remote IPC |
| Studio native | Real editor/save/trust, video render/decode/player, ZIP, media token, OpenGL/IPython input, descendant cancellation and failed-output cleanup pass |
| Real engine | Five scenes incl. multi-file/updater/3D, MP4/GIF/MOV/PNG and FFmpeg decode pass; delayed import race also passes |
| Fresh managed runtime | Empty separate runtime directory → real uv/Python/pinned package install in 92.1s; verified identity/OpenGL/FFmpeg, actual blank render and separately authorized colour==0.1.5 project install pass |
| Local CodeForge 0.2.1 | No new regressions against unchanged baseline; Windows runner reports npm build/tests unavailable, which were run separately; Linux CI supplies its configured full gate |
| Installer lifecycle | Unavailable as detailed above; not inferred from native app tests |

Fresh runtime diagnostics: CPython 3.11.14, pinned upstream commit
`f427fc67df75513be0cd3f3329e327a9a19401c3`, ManimGL tag v1.7.2 (known 1.7.1
banner), AMD Radeon 780M OpenGL 3.3; FFmpeg available, LaTeX/dvisvgm absent.
Opening/importing remains non-executing. Unapproved runtime install and separate
dependency install were actually rejected before their authorized success paths.
Private generated evidence remains ignored, outside Git and production bundles.

The first native dev check encountered stale Vite HMR module instances; restarting
the test server and waiting for the matching settled search response fixed the test
setup without reducing assertions. Studio E2E uses the actual production frontend
preview. A new contrast probe initially sampled an in-progress reduced transition;
the probe disables its own transition, preserving the ≥4.5 assertion. Full native
Clippy exposed an existing redundant Some/`?`; the equivalent response construction
was simplified. CodeForge's JSX-string parser rejected braces inside a quoted
placeholder; using an equivalent JS string expression preserves its content and gate.

## Pages and remaining limits

Actual HTTP recheck on 2026-10-24: canonical `/panostem/` **200**; historical
`/stem-visual-explorer/` **404** without redirect. Old GitHub repo and v0.2.0 release
links follow to the renamed repo and return **200**. [Official GitHub guidance](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)
excludes project-site URLs and warns that reusing the old repository name removes
ordinary redirects. Accept the historical Pages limitation within this repo's scope;
no old-name repository, personal-site or DNS workaround is authorized or used.

Packages remain unsigned, no automatic updater; a future signing policy is in the
[release checklist](../release-checklist.md). Optional LaTeX/dvisvgm, Sandbox guest
and non-Windows native packages remain unverified. Ordinary Python has user OS
permissions; MOV playback is codec-dependent. IPython simple-prompt preview retains
its upstream idle-refresh limitation. The app's local share export does not upload
content or create a public URL. Old releases/tags/assets and earlier audit text were
not rewritten; no unrelated repositories or DNS were changed.

## Publication appendix

Pending protected merge, exact-source CI, immutable tag and actual asset verification.
