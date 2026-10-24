# Panostem 0.5.0-alpha.1 delivery audit

Date: 2026-10-24 (Asia/Singapore). This source audit distinguishes implementation,
verification and publication. A plan or a successful mock is not release evidence.

## Audit and architecture

The original checkout was clean on docs/readme-evidence-20261008 (5346ee5).
Remote default main was 2fb0353, source 0.4.0-alpha.2; it already contained the
ontology, learning Workbench and JSXGraph lessons. Work uses the independent
feat/panostem-manimgl branch from that remote main. ADR commit: 0cfe0a1.
No user changes were reset, no history was rewritten and no old tag/release removed.

GitHub ADMIN permission was verified. Rules require a PR, squash merge and named
checks, with no bypass actors. Original published releases were v0.2.0/v0.1.1/v0.1.0.
Pages used /stem-visual-explorer/ without a custom domain. Repository rename and
publication occur only after the protected merge; their final URLs, merge/tag,
asset checksums and old/new HTTP behavior are recorded in the final release report.

The independent Python engine preserves the concept ontology and numeric lesson
renderer. Native preview is a separate window; Web plays media and displays source
without Python execution. Optional metadata is versioned and validates Concept IDs.
The Tauri identifier and all existing storage identities remain unchanged.
See [ADR](../adr/0005-panostem-manimgl.md), [plan](../panostem-plan.md),
[runtime guide](../manimgl.md) and [migration notes](../migration-panostem.md).

## Implemented and locally verified

| Area | Evidence |
| --- | --- |
| Managed runtime | Actual uv download/SHA validation, isolated CPython install and 59 pinned packages; first full installation completed in about 320 seconds |
| Runtime identity | Python 3.11.14; ManimGL tag v1.7.2 at f427fc67df75513be0cd3f3329e327a9a19401c3; tag banner/package says 1.7.1 |
| Graphics/native tools | Actual AMD Radeon 780M OpenGL 3.3 context, pinned imageio-ffmpeg binary; LaTeX/dvisvgm absent and optional |
| Project/editor | Native UI creation, actual CodeMirror edit/save, trust revocation, project ZIP export/import |
| Project dependencies | Actual separately authorized attrs wheel installation into a private project venv with a generated hash lock |
| Preview | Real independent OpenGL window, IPython embed and console line input |
| Process lifetime | Real spawned descendant terminated on cancellation; failed/cancelled task directories removed |
| Rendering | Actual blank, curve transform, 3D surface, time-varying oscillator and multi-file custom-class/updater scenes; generated files decoded by FFmpeg; GIF, transparent MOV and PNG final frame also render/decode |
| Native playback | Rendered MP4 loaded in the actual WebView2 application; scoped random media token validated |
| Web sharing | Actual rendered example import/play/seek, local ZIP downloads, opt-in source, corruption rejection and concept navigation |
| Browser access | Three Studio locales, 390px viewport, Reduced Motion and keyboard focus |
| Existing learning | Mathematical invariants/state machine/Workbench contracts retained; browser lesson/keyboard/24 three-language states pass |
| External safety | Existing provider preview policy and native external-window IPC denial pass |

Local host: Windows 11 x64, build 26200. The runtime installer did not alter global
PATH or system Python. A separate application-managed environment was used to test
first setup. Runtime/package sources, wheel hashes and actual notices are retained.

## Test results

- JavaScript baseline: 36 unit assertions, 1,395 language resolutions, 51 golden
  cases, index-baseline contracts, 12 learning groups and Workbench contracts pass.
- New share/metadata/parameter/path/version/hash/storage/execution contracts pass.
- ESLint for the new Studio TypeScript/React surface and TypeScript build pass.
- Rust: 41 tests pass; pure-core Clippy passes with warnings denied; desktop compiles.
- All 17 Python project/runtime contracts pass, including assets, recoverable trash,
  invalid render options and Sandbox configuration.
- Browser: 23 existing groups, all guided-lesson/Workbench groups and Studio
  sharing/localization/narrow-screen regression pass.
- Native WebView2: all seven original desktop regression groups pass. The native
  Studio regression additionally verifies editor, render, media, project ZIP,
  actual preview/IPython, descendant cancellation and failure cleanup.
- npm audit: zero vulnerabilities after a compatible selector-parser override.

The first disk-limited builds failed when the project drive ran out of space.
Generated Rust artifacts were moved to another drive and failures rerun. Initial
native checks during active edits included a timeout; the stable rerun passed with
the existing assertions intact. A Vite SharedWorker/CDP tooling incompatibility was
avoided by testing Studio against the production frontend, rather than modifying
Playwright or weakening application checks. A save/authorization race found by that
test was fixed by disabling trust grants while saves are pending or buffers dirty.

The first CI run exposed canonical temporary-path aliases on macOS/Windows and
missing Xauthority in Linux render subprocesses. Root normalization and an
explicit XAUTHORITY graphics environment fix address those causes. CodeForge
findings were fixed with poison-aware task state, error propagation and safe
win32job/nix process wrappers, without changing its baseline or checks. The
complete PR scan now has no new findings. Native cancellation is revalidated
after changing process wrappers.

CI includes real Xvfb/Mesa rendering and cross-platform contracts. A configured CI
job is not claimed passed here before its actual run. Publication is gated on the
required checks and the additional real-render job.

## Security and licenses

Opening/importing does not import Python or install packages. Execution and
dependency grants are separate; source revisions are checked before launch.
Processes use argument arrays and an environment allowlist. Windows Job Objects
and Unix process groups manage lifetime; logs/history/timeouts are bounded.
Media tokens are random, canonical paths are rechecked and external windows are
denied media/IPC. Sharing rejects traversal, symlinks, unsupported types, oversized
archives, incompatible versions, missing files and hash mismatches. Source is opt-in.

AGPL-3.0-only remains unchanged. ManimGL MIT provenance is verified at the locked
commit. Actual production npm, Rust build and installed Python inventories and
license texts are supplied. PyOpenGL's missing wheel license is supplemented from
the SHA-verified exact source archive; FFmpeg's own GPLv3/build output and full
license text are retained. See [third-party notices](../../THIRD_PARTY_NOTICES.md).
Final Windows-distribution review also found published archives missing their
license texts. CodeMirror wrappers and seven Windows Rust package/version entries
now have supplemental texts from their precise recorded upstream commits (or the
standard MPL-2.0 text), with file hashes and package mappings. Build-only and
experimental-platform dependencies remain separately identified in the inventory.
User content and third-party textbooks/assets are not automatically relicensed.

## Partial, unavailable and known limitations

- **Partial / unavailable:** Windows Sandbox configuration export is implemented
  and contract-tested. Windows Sandbox is not enabled/present on the test host;
  actual guest/GPU execution is unverified. Local Run is expressly not a sandbox.
- Linux/macOS are experimental; there are no unverified native release claims.
- Optional LaTeX/Tex rendering was not validated on this host; templates avoid it.
- Native preview console is line-oriented, not a complete terminal emulator.
  IPython simple-prompt mode has no Manim input hook; idle embedded-prompt window
  refresh is not guaranteed. Normal scenes use the native ManimGL window loop.
- MOV playback is codec-dependent; MP4 is the portable share choice.
- The app has no automatic updater or signing certificate. Cross-name installer
  migration may leave old shortcuts; existing application data identity is retained.
- Repository redirects do not guarantee old Pages redirects. Only this repository
  is changed; no personal site, other repository or DNS is modified.

## Publication record

The intended repository is [styayur/panostem](https://github.com/styayur/panostem),
the intended alpha release is [v0.5.0-alpha.1](https://github.com/styayur/panostem/releases/tag/v0.5.0-alpha.1),
and the new static path is [Panostem Pages](https://styayur.github.io/panostem/).
These are targets in the pre-publication source audit. Final PR/merge/tag, deployed
HTTP checks and actual per-asset SHA-256 are supplied by the completed release
report; this audit does not manufacture a success state or placeholder release.
