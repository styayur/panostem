# Actual alpha.2 interface captures

Captured on 2026-10-24 from this checkout's running application. `before/` is
main `7eba670619587842b25ab15b544d421035501c0e` (alpha.1 UI); `after/` is the
alpha.2 implementation on `feat/panostem-engineering-ui-hardening`. The containing
Git commit records the precise after-source revision.

| View | Before | After |
| --- | --- | --- |
| Search/results | [search](before/search.png) | [search](after/search.png) |
| Concept/Workbench | [concept](before/concept.png) | [concept](after/concept.png) |
| Guided lesson | [lesson](before/lesson.png) | [lesson](after/lesson.png) |
| Web rendered-media playback | [playback](before/playback.png) | [playback](after/playback.png) |
| Narrow Web (390×844) | [mobile](before/mobile.png) | [mobile](after/mobile.png) |
| Native editor (1440×900) | [editor](before/studio-editor.png) | [editor](after/studio-editor.png) |
| Native playback | [player](before/studio-playback.png) | [player](after/studio-playback.png) |
| Native tasks/logs | [tasks](before/studio-tasks.png) | [tasks](after/studio-tasks.png) |

Additional actual theme/localization captures: [Traditional Chinese dark search](after/search-dark-zh-TW.png),
[Simplified Chinese dark mobile](after/mobile-dark-zh-CN.png).

Browser captures use real Chromium/Playwright at 1440×900 and 390×844, with Reduced
Motion. Native captures use real Windows WebView2, the separate audit application
identifier `org.stemvisualexplorer.audit20260929`, and synthetic oscillator template
projects in an ignored test directory. The production identifier is unchanged.
Native output was rendered by the actual managed ManimGL process, then played past
one second before capture. Web playback uses the committed real oscillator share.
The native run controls scroll independently; the editor capture resets that panel
to its top, while the playback/task captures scroll the main workspace downward.
Native file-picker text follows the host's Windows language.

No primary-user project/data, generated mockup or image-generation tool was used.
`docs/studio-web.png` copies the after playback view. `docs/studio-desktop.png`
is the actual 1440×1400 native E2E capture, taken after exact editor-save verification
and real oscillator playback; the directly comparable native editor capture above
remains 1440×900. The 18-combination regression retains additional screenshots only
under ignored `artifacts/design/`; screenshots are not production Web assets.
