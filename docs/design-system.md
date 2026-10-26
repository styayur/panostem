# Vextessera interface conventions

Vextessera is a STEM workbench and local scene editor. Its interface uses technical
document hierarchy and IDE density: clear titles, fine panel separators, readable
data, and a restrained teal selection/focus accent. Zensical's documentation
hierarchy informed the review; no Zensical code, layout or assets were copied.
Scientific plot colors and numerical models remain independent of application
chrome. No UI dependency was added for this redesign.

## Tokens

`src/design-tokens.css` is authoritative. Tailwind's canvas/surface/edge aliases,
Workbench, lesson controls, command palette and Studio resolve to these variables.
Do not add a second component palette.

| Role | Light | Dark |
| --- | --- | --- |
| Background | `244 247 247` | `17 26 29` |
| Panel | `255 255 255` | `25 37 41` |
| Subtle surface | `236 241 242` | `33 48 53` |
| Text | `25 43 47` | `225 235 237` |
| Secondary text | `79 100 106` | `166 185 191` |
| Separator | `203 215 218` | `65 87 94` |
| Accent | `10 108 99` | `104 218 201` |
| Error | `171 38 32` | `255 164 155` |
| Warning | `132 76 12` | `237 192 108` |
| Success | `24 106 70` | `120 220 172` |

RGB channels permit shared opacity variants. Solid primary actions use the darker
`--ps-solid-rgb` with white text in both themes. Neutral code/log surfaces use
`--ps-code-bg` / `--ps-code-ink`; syntax highlighting retains CodeMirror's grammar
colors. UI text uses Segoe UI/system/CJK fallbacks; code and paths use Cascadia
Code/Consolas/system monospace. No font download is required. Body text is 13px,
secondary text generally 12px, titles 19–21px, with 1.5 line height. Compact
metadata may use 11px; mathematical equations and graph areas retain their scale.

Spacing tokens are 4/8/12/16/24px. Controls are 34px on desktop, at least 40px on
coarse pointers; primary navigation and result actions reach 44px on touch.
Ordinary corners are 4px, overlays 6px. Shadows belong to overlays. Use separators
and spacing for hierarchy instead of nested decorative cards.

## Component patterns

- Buttons: neutral panel/border, clear hover and selected state; solid teal only
  for primary actions. Icons need accessible names and recognizable functions.
- Inputs/selects: persistent labels, panel surface, standard native behavior.
  Checkboxes use the accent and an adjacent label; never hide consent in an icon.
- Badges: compact source/type/relevance information. Status includes readable text;
  color alone does not communicate running/completed/failed/cancelled.
- Toolbars/panels: aligned controls, fine separators, bounded scrolling. Studio's
  file/editor/run arrangement gives most width to code; playback and bounded,
  vertically resizable logs sit together below. The right run panel scrolls
  independently at ordinary desktop heights.
- Empty states: a useful instruction and real concept examples or next action.
  Loading/error/no-result states remain distinct. Error/disabled text stays readable.
- Dialogs: labelled dialog semantics, visible focus, Tab/Shift+Tab containment,
  Escape dismissal and focus restoration. Destructive output deletion and file
  trash actions request explicit confirmation; unsaved edits keep their own guard.

Shared `.ps-*` patterns live in `src/index.css`; existing `Badge`, `IconButton`,
`Kbd`, localized controls and panel components remain the building blocks. Studio
uses the same token layer with workspace-specific proportions. No new UI framework,
terminal emulator or general layout engine is introduced.

## Accessibility and responsive behavior

Use the existing EN/简体中文/繁體中文 dictionaries. Keep a visible 2px focus ring,
skip-to-content link, readable disabled controls and restrained status announcements
(elapsed time is outside the live status). Reduced Motion minimizes transitions and
animations; teaching motion still follows the lesson's existing explicit controls.
System-theme changes also update the Python editor.

At 390px the application navigation retains text labels. Source filters expand
inline above results, and Escape returns focus to the toggle. Result rows retain
their existing virtualization height. Workbench graphs/equations keep useful space;
Studio Web stacks player and metadata. Desktop windows retain their existing
minimum size; CSS also supports narrower test viewports without a new layout engine.

`scripts/design_browser_regression.mjs` checks 18 locale/theme/viewport combinations
(1440×900, 1280×800, 390×844), horizontal overflow, text-token contrast ≥4.5:1 on
the three neutral surfaces, keyboard filter dismissal, dialog focus and focus rings.
Existing lesson/Workbench/Studio suites cover real interaction and Reduced Motion.
This is focused regression evidence, not an exhaustive accessibility certification.

## Actual visual evidence

Before/after captures live in [`ui-alpha2/`](ui-alpha2/README.md). They show the
running Chromium/WebView2 application and real ManimGL media, not illustrations.
Screenshots are documentation assets, outside Vite's production bundle. Update
them only after inspecting the actual rendered UI and retain capture provenance.
