# Contributing

Vextessera connects concept-driven STEM discovery and guided lessons with native ManimGL scene authoring. Keep the two execution engines independent and use the existing ontology as the concept authority.

## Development

Requirements: Node.js 22.12+, npm, Rust stable, and WebView2/Windows C++ build tools for the desktop app.

```bash
npm ci
npm test
npm run build
npm run build:web
npm run lint
python -m unittest discover -s tests/runtime -v

cd src-tauri
cargo fmt --check
cargo test --no-default-features
cargo clippy --no-default-features --all-targets -- -D warnings
```

Run browser tests documented in the README for UI/search/provider changes. Desktop WebViewer changes require the Windows regression workflow or an equivalent local run.

## Architecture boundaries

- Core domain: resource discovery, multilingual query normalization, ranking, preview selection, favorites/history, and comparison.
- Providers implement `SearchProvider` and return normalized `SearchResult` values.
- Preview behavior is declared in `src/lib/previewCapabilities.json` and must be conservative.
- WebViewer is a supporting capability for inspecting a selected resource, not a browser product.
- CSP and X-Frame-Options are never bypassed with proxy/header-rewrite fallbacks.
- New providers require a fixture or parser contract test and metadata aligned across Rust/browser policy.
- Provider-specific behavior belongs in the provider module, not in generic UI components.
- ManimGL means the pinned 3b1b/manim engine, not Manim Community. Verify CLI/API changes against the immutable source and run real rendering tests.
- Ordinary Python projects must work without proprietary base classes or metadata. Web never executes Python.
- Opening a project must not execute code or install packages. Runtime and project-dependency installation require separate grants.
- Preserve trust-revision checks, archive/path/hash validation, process containment, bounded output, the legacy bundle identifier and existing storage keys.
- New runtime versions require regenerated hashes, license inventories, 2D/3D/updater renders and decoded-media evidence. See docs/manimgl.md.

## Pull requests

Add tests for parsing, ranking, normalization, and regression cases. Keep Chinese and English README claims synchronized. Maintainers perform releases. Security issues must follow [SECURITY.md](SECURITY.md).
