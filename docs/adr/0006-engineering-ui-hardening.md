# ADR 0006: engineering workspace and alpha.2 release hardening

Status: accepted for implementation, 2026-10-24.

The verified baseline is main 7eba670 (alpha.1 release source cad3dd2). The checkout was clean and the protected rules still require PR/squash, four checks and no bypass. This task uses feat/panostem-engineering-ui-hardening; old releases/tags and compatibility identities are retained.

## Decisions

Use one CSS custom-property token layer for shell, Workbench, lessons and Studio. Neutral surfaces and teal interaction states identify the application; scientific plot colors retain data meaning. Segoe UI/system CJK and Cascadia Code/system monospace use installed fonts. Dense controls remain at least 32px, with larger touch targets. Existing Tailwind and components are reused, without another UI framework. Studio retains file/editor/run panels with visible playback/tasks. Zensical is an information-hierarchy reference; no branding/assets/code are copied.

The trust audit reproduced a file-boundary collision in the old concatenated project fingerprint. Alpha.2 must use a versioned, framed per-file digest manifest and run a captured, revalidated source tree rather than re-reading the original project after consent. This does not isolate user Python from the OS. Snapshot-relative files belong to the reviewed run; explicit project/output paths remain available for intentional writes. Dependency review must also use the reviewed requirements bytes.

Embedded previews must use a canonical destination built from an approved static origin, reject credentials/non-default ports and mismatched providers, and enforce frame-origin restrictions through CSP, including redirects. Existing iframe sandbox and external-viewer IPC denial remain. CodeQL disposition follows observed source/browser evidence, not dashboard color.

Keep the patched PostCSS graph if a clean installation confirms it; investigate the stale platform alert separately. Do not force GLib 0.20 into the semver-incompatible GTK3 0.18 graph. Only a demonstrably compatible upstream change can widen Linux claims.

No production-user installer test is allowed. The available host is Windows 11 Home (SKU 99), medium integrity with Administrators deny-only, and no discovered Sandbox/VM runner. Investigate actual installer identities and record unavailable lifecycle tests precisely unless a genuinely disposable Windows environment becomes available. Changing APPDATA alone is not isolation.

## Acceptance and sequence

1. Capture real baseline views; preserve existing unit/search/learning/native contracts.
2. Add failing trust/URL regressions, fix confirmed defects and preserve actual-engine validation.
3. Apply tokens and engineering hierarchy across search, favorites/settings, dialogs, Workbench/lessons and Studio; inspect actual screenshots in three locales, themes and narrow layouts.
4. Verify dependency graphs, installer policy, Linux disposition and legacy Pages behavior; add design system, release checklist and dated audit.
5. Align alpha.2 identity, run all applicable local checks and actual runtime/native tests, push protected PR, resolve CI and merge normally.
6. Wait for exact-source gates; create only the new immutable alpha.2 tag, build/download/verify its actual assets and exercise deployed Web. Record final metadata without rewriting alpha.1 evidence.

## Risks

Snapshot cwd differs from the editable project; document optional original-project/output paths and preserve source-to-editor traceback mapping. Old-render source attestation needs re-rendering under the framed revision contract. Imported code still has current-user OS permissions. Installer lifecycle, optional Sandbox guest/GPU and LaTeX may remain unavailable, and must never be reported passed. Existing GLib upstream constraints, unsigned alpha packages and historical Pages 404 require precise dispositions.
