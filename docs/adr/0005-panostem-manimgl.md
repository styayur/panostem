# ADR 0005: Panostem and independent ManimGL execution

Date: 2026-10-24. Status: accepted for implementation; verification is tracked separately.

## Audited baseline

The checkout was clean on `docs/readme-evidence-20261008` (5346ee5). Remote default
`main` is 2fb0353, source 0.4.0-alpha.2. Work starts on `feat/panostem-manimgl`
from that remote main, preserving the older branch. No applicable AGENTS.md exists.
The latest published release is v0.2.0, with Windows installer, portable ZIP and
SHA256SUMS. Pages uses workflow deployment at `/stem-visual-explorer/`, without
a custom domain. Repository rules require a PR, squash merge and four checks;
there are no bypass actors. The authenticated account has ADMIN permission.

Source contains the 490-concept ontology, deterministic query resolver, learning
profiles and Workbench, three guided math models, SceneFrame/ScenePrimitive and
JSXGraphRenderer. The renderer validates typed numeric primitives and rejects
expression strings. External WebViewers are denied application IPC by window
label, and URL/preview policies stay unchanged. Browser storage keys, SQLite
data and `org.stemvisualexplorer.app` are compatibility identities, not branding.

Baseline JS tests pass: 36 unit assertions, 1,395 language resolutions, 51 golden
queries, index baseline, 12 learning groups and Workbench contracts. Browser,
Rust and build results are recorded in the delivery report after completion.

## Decisions

1. Keep JSXGraph and its trusted numeric renderer unchanged. Add an independent
   Studio and execution backend; no generic renderer rewrite or Python DSL.
2. Desktop runs ordinary Python projects through upstream 3b1b/manim, ManimGL
   1.7.2, commit f427fc67df75513be0cd3f3329e327a9a19401c3. Never track master.
   CLI options are derived from that commit's manimlib/config.py. Native OpenGL
   preview is a separate window; the WebView displays completed media only.
3. Manage CPython 3.11.14 and an application venv using pinned uv, with explicit
   install/repair actions. Use hash-locked wheels and immutable upstream source.
   FFmpeg comes from a pinned imageio-ffmpeg wheel, privately placed on child PATH.
   Project dependencies use a separate environment and require separate consent.
4. Rust owns bounded tasks, cancellation, timeouts and process-tree cleanup.
   A bundled Python controller handles filesystem/project contracts and calls
   upstream CLI through argument arrays. Environment inheritance is allowlisted.
5. Python execution is trusted local execution, not a sandbox. Trust is explicit
   per source content revision. Windows Job Objects provide process containment,
   not file/network isolation. OS sandbox research and limitations are documented.
6. Versioned optional metadata references the existing ontology. Ordinary projects
   run without metadata or proprietary base classes. Parameter integration uses
   PANOSTEM_PARAMETERS JSON, with typed/ranged validation and explicit opt-in code.
7. Share ZIPs use an explicit file allowlist and SHA-256 manifest. Source inclusion
   is opt-in. Static Web imports validate paths, sizes, versions and hashes; it
   displays escaped source and Blob media without evaluating Python or HTML.
8. Preserve the Tauri identifier and old storage keys. Rename public product,
   package and assets. Web base is `/panostem/`, independently configurable for
   pre-rename deployment. GitHub repository redirects do not ensure Pages redirects.
   Do not modify another repository or DNS to repair the old Pages endpoint.
9. Ship an alpha version only after evidence and required checks. No placeholder
   binaries, fake status badges, rewritten history or overwritten old releases.

## Studio design

Reuse the application's system UI font; code uses the editor's monospace font.
Palette: paper #f8fafc, ink #172033, boundary #cbd5e1, teal #0f766e, amber #92400e,
white #ffffff. Left-aligned file navigation, large code surface and a dedicated
task/media area reflect an actual mathematical authoring tool. Retain existing
app navigation rather than introduce a second dashboard shell.

```text
Project / runtime / import-export actions
Files | Python editor               | scene, parameters, render settings
      |                             | video / frame
      | bounded logs and task history
```

Only the code surface receives strong visual emphasis. Controls wrap at narrow
widths; keyboard focus, labels, three locales and reduced motion remain supported.
Review: avoid generic card grids and decorative gradients; retain the existing
learning UI and make Studio a practical workspace.
