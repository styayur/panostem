# Migration from STEM Visual Explorer to Panostem

The public product name is Panostem, starting with source 0.5.0-alpha.1.
The intended repository is `styayur/panostem`. Actual rename/deployment/release
results are recorded in `docs/audits/panostem-delivery.md`; plans are not publication
evidence. Historical releases, commits, audit reports and copyright notices retain
their original identities.

The Tauri bundle identifier stays **org.stemvisualexplorer.app**. Browser keys
`sve.settings`, `sve.favorites`, `sve.history`, legacy index caches, lesson/Workbench
storage identities and desktop SQLite data remain unchanged. There is no destructive
data conversion. Rollback to a previous release uses the same original data keys;
new Studio projects/renders live in user-selected directories and the runtime in a
separate application data subdirectory. Back up user data before changing versions.

Public npm/Rust package and executable names are `panostem`; the Rust library crate
name remains `stem_visual_explorer_lib` for source compatibility. Desktop display,
installer and portable names change to Panostem. A display-name change may leave
older shortcuts/install directories; there is no automatic updater or guarantee of
a silent cross-name upgrade. Keep user data while removing an older installation
if Windows lists both. Do not manually remove the shared application data folder.

The static build defaults to `/panostem/`. Development and Tauri use `/`.
`PANOSTEM_BASE=/some-path/ npm run build:web` overrides only the static build.
The Pages workflow derives its base from the repository name, so a pre-rename
deployment can still serve the old path and a post-rename dispatch uses the new one.

GitHub repository redirects preserve ordinary repository links after a rename,
but [GitHub Pages redirects are a separate concern](https://github.blog/news-insights/product-news/repository-redirects-are-here/).
This project cannot place a redirect at a sibling Pages path from its own Pages
artifact. No personal site, other repository or DNS configuration is changed.
The final audit records the observed old/new HTTP behavior. Prefer the new URL,
update bookmarks and do not create a second repository with the old name merely
to manufacture a redirect, because that would also alter GitHub redirect behavior.
