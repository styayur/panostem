# Windows alpha release checklist

## Source and review

- Inspect clean/dirty state, default branch, remotes, protections, PRs and alerts.
  Preserve existing work and compatibility/storage identities.
- Use a dedicated branch and protected PR; retain required checks, CodeForge
  baseline and security review. No direct main push, force push or protection bypass.
- Align package/lock root, Tauri config and Cargo package/lock versions. Validate
  `--verify-build` product, bundle identifier, runtime commit and source hashes.
- Review AGPL-3.0-only, notices, upstream ManimGL commit and hash-locked runtime
  dependencies. Keep user projects, generated runtimes, caches and binaries untracked.

## Validation and dispositions

- Clean `npm ci`; inspect all lockfiles, `npm ls`/`explain`, audit and GitHub graph.
  Record actual alert status separately from local audit results.
- Run lint/typecheck, production and Pages builds, all existing unit/search golden/
  multilingual/index, learning mathematics/state, Workbench and share boundaries.
- Run browser, narrow layout, light/dark/three locales, keyboard/Reduced Motion,
  dialog and URL/redirect regressions. Inspect actual before/after captures.
- Run Rust fmt, pure tests and Clippy with warnings denied; Windows native build
  and WebView2 regression. Do not use contract tests to claim native platform support.
- Run Python contracts, fresh managed runtime setup where available, all five real
  OpenGL scenes, multi-file/updater, output formats and actual FFmpeg decode.
  Exercise trust changes, capture races, separate dependency consent, preview
  console, descendant cancellation, timeout/cleanup and media/IPC denial.
- In a real disposable Windows VM/profile, install the actual old/current installers;
  verify clean install, old→new policy, launch/persistence, registry, shortcuts,
  uninstall/reinstall and external project preservation. APPDATA redirection alone
  is not isolation. If unavailable, record each test as unavailable and avoid
  claiming a verified upgrade lifecycle. Apply the documented conservative policy.
- Investigate GLib using target-specific graphs and upstream fixes. Experimental
  platforms remain experimental until their native gates pass.
- Record unresolved limitations and signing status. No release with an exploitable
  serious Windows trust defect, false support claim, failed required check or data loss.

## Publication

- Merge with permitted strategy; fetch and identify the exact merged source.
  Require successful CI, CodeForge and all four CodeQL languages on that commit.
- Confirm tag/release absence. Tag the merged source only after all gates pass;
  never replace an old tag or retry a published release by overwriting assets.
- The release workflow independently validates merged ancestry, version alignment,
  immutable tag source, release absence and exact-source checks before building.
  It publishes a Windows NSIS installer, portable ZIP and `SHA256SUMS.txt`.
- Download the published bytes; independently compare sizes, SHA-256 manifest and
  GitHub asset digests. Inspect ZIP contents, licenses/docs, PE metadata and the
  executable's embedded identity/source hashes. Do not substitute local binaries.
- Check actual release and asset URLs, Pages deployment/HTTP and the published app
  (search, lessons, share playback, locales/themes/narrow view). Recheck legacy URLs.
- Record PR/merge/tag SHAs, Actions URLs/conclusions, assets/sizes/hashes, screenshots,
  alert disposition, native/installer limitations and final clean worktree. Append a
  new audit; do not retrospectively rewrite earlier-release evidence.

## Signing and updates

Current alpha packages are **unsigned**, with no automatic updater. Windows may
show an unknown publisher warning. Checksums establish byte identity, not publisher
authentication. Future signing requires a maintainer-controlled certificate or
trusted signing service, protected secrets/environment approval, timestamping,
independent signature verification and certificate rotation/revocation policy.
No certificate, signature or updater is implied by this checklist.
