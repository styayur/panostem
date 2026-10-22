# STEM Visual Explorer

A concept-driven mathematics and physics workbench for resource discovery, comparison and guided visual learning.

[简体中文](README.zh-CN.md) · [Web app](https://styayur.github.io/stem-visual-explorer/) · [Windows v0.2.0](https://github.com/styayur/stem-visual-explorer/releases/tag/v0.2.0) · [Architecture](docs/architecture.md)

**Alpha.** Current source is 0.4.0-alpha.2; the latest formal Windows release is v0.2.0. Later Workbench/retrieval features in source are not automatically included in that download.

![Existing STEM Visual Explorer search interface capture](docs/screenshot.png)

This retained actual search capture is not a new screenshot or proof that every external source is currently available.

## Quick start

Open the [web app](https://styayur.github.io/stem-visual-explorer/) and search `gradient`, `旋度`, `"standing wave"`, `site:falstad wave` or `type:interactive gradient`. It needs no account, API key or backend installation. Source/current web functionality includes a concept Workbench with Overview, Learn, Visualize, Resources and Graph, plus three native guided lessons: harmonic motion, ellipses and linear transformation/determinant. Lessons support English, Simplified and Traditional Chinese; textbook references are external metadata, not bundled textbooks.

The Windows [v0.2.0 release](https://github.com/styayur/stem-visual-explorer/releases/tag/v0.2.0) has a setup EXE, portable ZIP and `SHA256SUMS.txt`. Verify the selected archive's full hash before running and extract portable files completely. Windows desktop requires WebView2; the installer handles missing runtime according to its configuration, while portable use needs an existing runtime. Do not assume the runtime is present on every Windows machine.

## Web and desktop boundaries

| Area | Static web edition | Windows desktop source |
| --- | --- | --- |
| Search data | Committed seven-provider snapshot; 1,079 entries in this source revision | Rust source indexes and native search where supported |
| Local data | Browser storage for favorites, history, settings and cached indexes | Local SQLite and index files |
| External viewers | Browser tabs/popups | Restricted WebView2 viewers and workspace windows |
| Native-page translation | Opens an external translated page or configured proxy | In-place text translation/restore |

Both use deterministic concept/query ranking, not an LLM. A 490-concept ontology resolves English/Simplified/Traditional Chinese terminology. Direct/equivalent terms enter retrieval; related/prerequisite concepts require explicit expansion and are labelled. Dates and stale status identify the web snapshot; it is not live site search.

Falstad is configured for embedding under the app’s declared policy. Other providers use resource cards or external access; unknown/mismatched origins fall back to cards. The app does not strip CSP/X-Frame-Options or bypass login/anti-bot restrictions. See [retrieval](docs/retrieval.md), [preview policy](docs/provider-extension.md) and [visual lessons](docs/visual-learning.md).

## Source development

Use Node.js 22.12+ and npm. Desktop work also needs stable Rust, platform Tauri dependencies, WebView2 and a Windows C++ toolchain. MSVC Build Tools/Windows SDK is the usual Windows path. GNU builds additionally require MinGW `windres`/preprocessing tools; a self-contained Rust linker alone does not build the desktop. See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```sh
git clone https://github.com/styayur/stem-visual-explorer.git
cd stem-visual-explorer
npm ci
npm run dev
```

Vite uses port 1420; outside Tauri, the frontend selects the static-index backend. Run desktop development with `npm run tauri -- dev`, desktop frontend build with `npm run build`, and native packaging with `npm run tauri -- build`.

For the static Pages subpath:

```sh
npm run build:web
npm run preview -- --mode web
```

Open `http://localhost:4173/stem-visual-explorer/`. The index is data, not a complete offline app shell; reopening offline still depends on browser asset caching. External pages and uncached images require their own availability.

## Testing and CI

From the root:

```sh
npm test
npx playwright install chromium
npm run test:web
npm run test:web:build
```

Rust logic checks:

```sh
cd src-tauri
cargo fmt --check
cargo test --no-default-features
cargo clippy --no-default-features --all-targets -- -D warnings
cargo check --locked
```

[CI](https://github.com/styayur/stem-visual-explorer/actions/workflows/ci.yml) checks frontend/types, deterministic browser behavior, Rust logic and Windows desktop compilation. Browser tests use fixed external-frame/translation responses, so they do not certify third-party uptime. `npm run test:desktop` needs an isolated Windows audit build/profile; follow [functional audit setup](docs/functional-audit.md). Recorded Workbench evidence is in the [v0.4 report](docs/audits/v0.4-workbench-report.md).

Live provider probes and index regeneration require network access and are separate from offline tests. [Chinese development details](README.zh-CN.md#本地开发) and [retrieval documentation](docs/retrieval.md) describe refresh/review gates. Do not run update tools just to make a documentation-only PR appear current.

## Privacy and limitations

No account, telemetry, analytics or cloud database is used. Desktop searches contact source websites directly. Translation is off by default; when enabled, text outside the local glossary goes to the third-party MyMemory service and is subject to its quota/availability. Configured external page proxies also receive requests.

External viewers accept HTTP/HTTPS and have no app IPC capability, including after navigation to a local app URL. Preview policies are conservative app choices, not a guarantee that every source always permits/refuses framing. Browser popups can be blocked. Source HTML changes, stale snapshots and experimental PhysicStuff/Maotian adapters can fail; failures are reported per provider. Desktop indexes have a seven-day TTL with stale-cache fallback after automatic refresh failure.

## Roadmap and contributing

Provider coverage/parser resilience and index freshness remain next work; curated collections/richer visualization are future ideas. The product is a STEM resource/learning workbench, not a general browser or access-control bypass.

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [provider contract](docs/provider-extension.md). Submit [Issues](https://github.com/styayur/stem-visual-explorer/issues) with redacted source/version/query details; use [SECURITY.md](SECURITY.md) for vulnerabilities. Releases are maintainer-controlled tags with checksums, not automatic source-version promises.

## License

Application source uses [AGPL-3.0-only](LICENSE). External resource pages, images, simulations and textbooks retain their own rights; discovery metadata and links do not relicense their content. Existing copyright notices remain intact.
