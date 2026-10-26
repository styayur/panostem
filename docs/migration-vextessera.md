# STEM Visual Explorer → Panostem → Vextessera

Vextessera 0.6.0-alpha.1 changes the public product, npm/Rust package, executable,
installer/portable asset prefix and Web base. The Rust library crate remains
`stem_visual_explorer_lib`. Historical tags, releases, assets, notices, audit
documents and their original names remain intact.

## Preserved data and project contracts

- Tauri bundle identifier: `org.stemvisualexplorer.app`.
- Desktop application-data directory, `sve.db`, `settings.json` and cache paths.
- Browser `sve.settings`, `sve.favorites`, `sve.history`, index/translation keys,
  workspace notes and `sve.workbench.v1` session state.
- Studio `panostem.project-path`, application-data `panostem-runtime` directory,
  `panostem-media` scoped protocol and existing project trust machinery.
- Optional `panostem.json` version 1, `.panostem` project environment, parameters
  via `PANOSTEM_PARAMETERS`, and `panostem-share` version 1 / `.panostem.zip`.

No automatic destructive conversion is needed. A genuine alpha.2 share fixture
is read, hash-checked and exported again in tests. Synthetic historical-schema
browser fixtures test settings/favorites/history, workbench resume and Studio
path preservation; a temporary SQLite fixture exercises the old tables and
settings through the real new application state, then writes/reopens them. These
are data-format compatibility tests, not installer upgrade observations.

Web storage is scoped to origin, so project paths on the same GitHub Pages origin
share browser keys. That does not make an old Pages URL redirect to the new path.

## Windows installation and remaining lifecycle limit

NSIS remains `currentUser`. Product-name-derived install directories, shortcuts
and uninstall registry entries can differ across all three product names despite
the unchanged application-data identifier. An in-place cross-name upgrade is
unverified. The conservative procedure remains:

1. Close every version. Back up shared application data and external projects.
2. Uninstall the previous named application while preserving app data. Leave
   **Delete app data** unchecked if offered; do not manually delete the
   `org.stemvisualexplorer.app` directories or place projects in an install folder.
3. Install Vextessera for the current user, verify settings/favorites/history, and
   explicitly open existing project directories. Avoid simultaneous versions
   writing to the same SQLite or runtime state.
4. For interrupted installation, preserve data and rerun after closing the app.
   No automatic recovery or shortcut/registry cleanup result is claimed.

The verification host is Windows 11 Home. WindowsSandbox, VMware/VirtualBox and
QEMU runners were rechecked and unavailable. No installer was run against the
user's primary profile. Clean install, old-to-new upgrade, uninstall/reinstall,
interrupt recovery, registry/shortcut and data-preservation lifecycle tests remain
unverified until a disposable OS is available. Building/inspecting an installer,
portable execution and an isolated audit app are separate evidence.

There is no code-signing or automatic updater claim. Ordinary Python runs with
the user's OS permissions. Linux/macOS remain experimental; the existing
[GLib advisory](https://github.com/advisories/GHSA-wrw7-89jp-8q8g) remains open in
the GTK dependency graph and is not a fixed-security claim for those targets.

## Web and repository migration

The static default is `/vextessera/`; `VEXTESSERA_BASE` overrides it and the legacy
`PANOSTEM_BASE` override remains accepted. Desktop/development use `/`. The Pages
workflow derives its path from the actual repository name.

The target repository is `https://github.com/styayur/vextessera`, with target Web
URL `https://styayur.github.io/vextessera/`. Actual rename, redirect, HTTP/browser
and release-download evidence is recorded after execution. GitHub repository
redirects and project-site redirects differ. No old-name placeholder repository,
other repository, personal site or DNS change is part of this migration.

The earlier [Panostem migration record](migration-panostem.md) remains historical.
