# Implementation, risks and acceptance matrix

Date: 2026-10-24. This is a plan, not a claim of completion.

| Phase | Work | Evidence required |
| --- | --- | --- |
| A | Audit, baseline, ADR, version/platform strategy | Git/GitHub source records and test output |
| B1 | Runtime installer, locked environment, diagnostics, managed processes | Contract tests and actual Python/OpenGL/FFmpeg runs |
| B2 | Project files, templates, editor, preview, render, history | Desktop workflow and error/cancel tests |
| B3 | Metadata, concept registry, parameter contract, share ZIP | Schema/path/hash tests and Web playback regression |
| B4 | Public brand, deployment and compatibility | Storage tests and actual Pages navigation |
| B5 | Documentation, notices, screenshots and CI | Real screenshots, synchronized guides, dependency inventory |
| C | Review, push, PR, required checks, squash merge | PR checks and merge SHA |
| D | Rename repository and origin, deploy Pages | API and HTTP evidence for both old/new addresses |
| E | Build packages, verify hashes, publish alpha | Real assets and tag/version/checksum match |
| F | Final audit | Delivery report distinguishing verified/published/blocked |

## Acceptance

| Requirement | Verification |
| --- | --- |
| Arbitrary standard ManimGL Python | Multi-file custom class, updater and 3D scenes run by real CLI |
| Project CRUD/import/export | Ordinary directory and ZIP, traversal/symlink/size rejection, no code on open |
| Editing | Maintained Python syntax editor, switching, save, traceback line navigation |
| Preview | Separate OpenGL window, bounded logs, stop/tree cleanup, app exit cleanup |
| Render | CLI options, task phases/history, timeout/cancel/retry, media existence/decoding |
| Runtime | Exact Python/ManimGL identities, wheel hashes, install/repair/diagnostics |
| Trust | Explicit run/dependency grants, no automatic installs or execution |
| Metadata | Version/concepts/entry/parameter validation against the canonical ontology |
| Web share | Safe ZIP import/export, opt-in source, playable media, never Python execution |
| Existing learning | Search, state machine, math invariants, JSXGraph and external preview regressions |
| Access | EN/zh-CN/zh-TW, narrow viewport, keyboard and reduced motion |
| Release | Protected PR merge, rename, real binaries/checksums, Pages and release URLs |

## Risks

- OpenGL driver/headless context differences: real Windows rendering is required;
  Linux CI uses Xvfb/Mesa; macOS is experimental until independently verified.
- Upstream 1.7.2 supports Python >=3.9 at its tagged setup.cfg; use 3.11.14 rather
  than the host's 3.14 to maximize binary-wheel availability. Current master has
  different requirements and is not the runtime API contract.
- Native LaTeX is optional and large. Detect latex/dvisvgm and report missing
  tools; templates that do not use Tex must work without it. Pango is supplied
  by Windows wheels; Linux requires system development/runtime libraries.
- Local Python can read/write files and use network. Venv and process containment
  do not make untrusted code safe. Full isolation requires a VM/OS sandbox and
  changes GPU/file workflows; never advertise ordinary execution as isolated.
- Installer downloads need network and disk. Fail with logs and retry/repair;
  never change global Python, PATH or execute dependencies on project open.
- ZIP bombs, symlinks, duplicate/case-conflicting paths, HTML/SVG payloads and
  missing/hash-mismatched files must fail closed before media URL creation.
- Repository rename breaks the Pages path independently of Git redirects.
  Preserve history and document old Pages behavior without touching other sites.
- Third-party assets and user outputs retain their own rights. Audit actual
  bundled npm/Rust/Python components; do not relicense the app or user content.
