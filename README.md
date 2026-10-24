# Panostem

A concept-driven STEM learning environment with native ManimGL authoring and rendering.

[简体中文](README.zh-CN.md) · [Web app](https://styayur.github.io/panostem/) · [Releases](https://github.com/styayur/panostem/releases) · [ManimGL guide](docs/manimgl.md)

[![CI](https://github.com/styayur/panostem/actions/workflows/ci.yml/badge.svg)](https://github.com/styayur/panostem/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/styayur/panostem?include_prereleases)](https://github.com/styayur/panostem/releases)
[![AGPL-3.0-only](https://img.shields.io/badge/license-AGPL--3.0--only-blue)](LICENSE)

**Alpha.** Current prerelease: **[v0.5.0-alpha.1](https://github.com/styayur/panostem/releases/tag/v0.5.0-alpha.1)**. ManimGL integration is experimental. The latest historical stable Windows release is [v0.2.0](https://github.com/styayur/panostem/releases/tag/v0.2.0), which predates Studio and guided lessons. The [delivery audit](docs/audits/panostem-delivery.md) records actual verification, release assets and deployment status.

![Actual Panostem Web playback of a real ManimGL render](docs/studio-web.png)

![Actual Windows Studio editor and rendered output](docs/studio-desktop.png)

## Capabilities

Panostem connects a 490-concept ontology with resource discovery, learning paths, external textbook references and three guided numerical lessons: harmonic motion, ellipses and linear transformation/determinant. Search resolves English, Simplified Chinese and Traditional Chinese deterministically. JSXGraph retains numeric-only rendering, keyboard access and Reduced Motion support.

ManimGL Studio adds ordinary multi-file Python projects, five templates, CodeMirror editing, native OpenGL previews, render tasks, logs and local share packages. Scenes may use standard ManimGL classes, custom modules, updaters and 3D cameras; no Panostem base class or animation DSL is required.

| Capability | Static Web | Windows desktop |
| --- | --- | --- |
| Concepts, learning paths, JSXGraph lessons | Committed seven-provider snapshot | Native source adapters |
| Settings, favorites and history | Browser storage | Local SQLite/files |
| External resources | Policy-controlled cards/frames or tabs | Restricted viewers/workspaces |
| Share ZIP, metadata, source and media | Import/export and playback; no Python execution | Yes |
| Projects, editing, assets and source export | View included source only | Yes |
| Standard ManimGL preview/render, cancel and logs | No Python execution | Managed local runtime |
| Cloud renderer, accounts or database | None | None |

Try the [rendered oscillator](https://styayur.github.io/panostem/?route=studio&example=oscillator). Share import/export is local; it neither uploads files nor creates a permanent URL.

## Architecture

```mermaid
flowchart LR
  O[Canonical concept ontology] --> Q[Query and resource discovery]
  O --> L[Learning profiles / Workbench]
  L --> J[Typed numeric scenes / JSXGraph]
  O --> M[Optional scene metadata]
  M --> S[ManimGL Studio / CodeMirror]
  S --> T[Tauri scoped IPC / task manager]
  T --> R[Managed Python / pinned ManimGL process]
  R --> N[Separate OpenGL window]
  R --> V[Video / frames]
  V --> Z[Manifest + SHA-256 ZIP]
  Z --> W[Static player / escaped source]
```

The engines remain independent. Existing concept IDs are authoritative; scene metadata cannot silently create new concepts. External viewers have no app IPC or rendered-media protocol access. See [architecture](docs/architecture.md), [ADR](docs/adr/0005-panostem-manimgl.md) and [acceptance plan](docs/panostem-plan.md).

## Install and use

Download an actual Windows installer or portable ZIP from [Releases](https://github.com/styayur/panostem/releases). Compare its full SHA-256 with that release's [SHA256SUMS.txt](https://github.com/styayur/panostem/releases/download/v0.5.0-alpha.1/SHA256SUMS.txt) before running. Asset names are `panostem_<version>_x64-setup.exe` and `panostem_<version>_windows-x64.zip`. Extract portable files completely. WebView2 is required; the installer handles a missing runtime according to its configuration, while portable use needs an existing runtime. Packages are not code-signed.

Windows 11 x64 is the primary verified target. Linux/macOS remain experimental without native release claims. In **ManimGL Studio**, authorize **Install / repair runtime**, then **Check environment**. Setup manages CPython **3.11.14**, uv **0.13.5** and ManimGL upstream **v1.7.2**, commit `f427fc67df75513be0cd3f3329e327a9a19401c3`. The tag's package/banner says 1.7.1; the immutable source commit identifies this runtime. Dependencies are hash-locked.

First setup needs network, user write/execute permissions and roughly 2–4 GiB free disk plus media storage. It changes neither system Python nor global PATH. Rendering needs OpenGL 3.3. FFmpeg is privately supplied by a pinned wheel; LaTeX/dvisvgm are optional for Tex objects. Native tool directories can be configured explicitly. The five templates require no LaTeX. See [runtime/platform details](docs/manimgl.md).

Create a template project, open an ordinary ManimGL directory, or import a project ZIP into a new directory. Edit/save source, select entry/class, review trust for the current revision, then preview or render. Native preview uses a separate window and upstream controls; IPython embed receives console line input. Render results provide playback, thumbnails, final frames and actual output paths. Tasks support bounded logs/history, cancellation and retry. Project dependencies require a separate authorization.

## Development and verification

Use Node.js **22.12+**, npm and stable Rust. Desktop builds need Tauri platform dependencies, Windows C++ tools/SDK and WebView2; see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
git clone https://github.com/styayur/panostem.git
cd panostem
npm ci
npm run dev                  # browser development, port 1420
npm run tauri -- dev         # native desktop
npm run build               # desktop frontend
npm run build:web           # static /panostem/ deployment
npm run tauri -- build --bundles nsis
```

Static preview: `npm run preview -- --mode web`, then `http://localhost:4173/panostem/`. `PANOSTEM_BASE` overrides the static path; development/Tauri use `/`. Pages derives its base from the repository name.

```sh
npm run lint                # new Studio TypeScript/React code
npm test                    # retrieval, math, state machine, Workbench and share contracts
npx playwright install chromium
npm run test:web
npm run test:web:build
python -m unittest discover -s tests/runtime -v
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features
cargo clippy --manifest-path src-tauri/Cargo.toml --no-default-features --all-targets -- -D warnings
```

Real runtime validation: `<runtime-python> scripts/runtime_smoke.py --runtime-root <runtime-directory>`. It renders and decodes five actual scenes, including 3D and a multi-file custom class/updater. Linux CI uses Xvfb/Mesa; runtime contracts run on Windows/Linux/macOS. `npm run test:desktop` needs the isolated profile in [functional audit setup](docs/functional-audit.md). Browser fixtures verify behavior, not third-party uptime. Real OpenGL validation is separate from mock/contract tests.

## Projects and sharing

Ordinary projects contain Python modules, assets, `custom_config.yml` and optional `requirements.txt`. Optional `panostem.json` v1 links entry scenes with concept IDs, objectives, prerequisites, sources, checkpoints and typed parameters. Parameters arrive as explicit `PANOSTEM_PARAMETERS` JSON; Python globals are not inferred as sliders.

Share ZIPs contain `manifest.json`, allowlisted media and optional selected source/notices. Entries have paths, sizes, MIME types and SHA-256. Import validates versions, traversal, symlinks, case conflicts, sizes/counts and hashes. HTML/SVG is rejected; Python is escaped text. Source is opt-in; venvs, environment files, private caches and logs are excluded. Full project export is a separate operation that explicitly includes project source/assets. See [project structure and package format](docs/manimgl.md).

## Trust, privacy and limitations

Python has the current user's file/network/system permissions. Execution trust is explicit for each project revision; dependency installation has a separate grant. Venvs, AST inspection, child processes and Job Objects are **not security sandboxes**. Windows Job Objects/Unix process groups manage lifetime; secrets and proxy credentials are not inherited. App-managed tasks have one-hour timeouts, bounded logs/history and explicit render cleanup. Arbitrary Python can write outside those limits.

Experimental Windows Sandbox export creates a separate VM configuration with network/clipboard disabled and read-only inputs; vGPU and a dedicated writable output folder remain shared. That OS component is absent on the local test host, so VM execution/GPU compatibility is unverified. Use disposable OS isolation for unknown code. Ordinary Run buttons do not provide it.

The application has no accounts, telemetry or cloud database. User Python/dependencies can make their own network requests. Desktop discovery contacts sources; Web uses a committed seven-provider snapshot (1,079 entries). Translation is off by default; enabling it sends non-glossary text to MyMemory, and configured proxies receive page requests. External sources/snapshots can fail or become stale. CSP/X-Frame-Options, login and anti-bot restrictions are not bypassed. The app is not an installable offline PWA; reopening offline depends on browser asset caching. MOV playback depends on codecs; MP4 is the preferred share format. See [SECURITY.md](SECURITY.md).

## Migration, license and contribution

Panostem replaces the public STEM Visual Explorer name. The Tauri identifier and legacy storage keys remain unchanged for data compatibility. Repository and Pages redirects behave differently; [migration notes](docs/migration-panostem.md) and the delivery audit record actual URL behavior. No unrelated repository, personal site or DNS is changed.

Application source remains [AGPL-3.0-only](LICENSE). ManimGL and CodeMirror are MIT; downloaded Python/native libraries retain their licenses. Actual inventories and notice texts are included in `licenses/` and summarized in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The app license does not automatically determine rights in user scenes, videos, textbooks or external assets.

Next work includes wider native-platform validation, stronger OS isolation, editor tooling and provider/index maintenance. Read [CONTRIBUTING.md](CONTRIBUTING.md), report reproducible [Issues](https://github.com/styayur/panostem/issues), and use private security reporting for vulnerabilities. Releases follow protected PRs, successful checks, real binaries and per-asset checksums.
