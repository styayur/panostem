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

## Windows installation policy for alpha.2

The explicit NSIS mode is **currentUser**. The unchanged bundle identifier controls
shared app data, but the upstream NSIS registration/install/shortcut names derive
from `productName`: historical `STEM Visual Explorer` and current `Panostem` are
different installation identities. They must not be assumed to form a tested
in-place upgrade. The conservative cross-name procedure is:

1. Close both applications and back up non-sensitive settings/SQLite data as well
   as any user-selected projects/output that matter to you.
2. Uninstall the old **STEM Visual Explorer** application. Leave **Delete app data**
   unchecked if offered. Never delete `org.stemvisualexplorer.app` data folders as
   an upgrade workaround. The new runtime also lives under that shared identity.
3. Install Panostem for the current user, then check settings/favorites and open
   existing project directories explicitly. Studio did not exist in v0.2.0; there
   is no historical runtime-state migration claim.
4. If both install entries/shortcuts remain, close both and remove the unwanted app
   while preserving app data. Do not run both against shared SQLite/runtime state.
   For an interrupted install, retain projects/data and rerun the installer after
   closing the app; no automatic recovery result is claimed.

The upstream template registers under
`HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\<productName>` for
currentUser, defaults below `%LOCALAPPDATA%\<productName>`, and creates product-named
shortcuts. Its optional app-data deletion removes both APPDATA and LOCALAPPDATA
bundle-ID directories. These are source-reviewed behaviors, not observed VM
installation results. User-selected external project directories are outside those
app-data paths; do not deliberately place projects inside the installation folder.

The verification host is Windows 11 Home (SKU 99), medium integrity, with no Windows
Sandbox executable or available VM/profile runner/credentials. Actual clean install,
v0.2.0→alpha.2 install, registry/shortcut, uninstall/reinstall, interruption recovery
and data-preservation lifecycle tests are **unavailable** here. Published installer
bytes/archive identity and portable execution are separate checks. Redirecting
APPDATA or using an audit app identifier is not claimed as installer isolation.
Use the [release checklist](release-checklist.md) in a disposable OS before treating
the upgrade lifecycle as verified.

The static build defaults to `/panostem/`. Development and Tauri use `/`.
`PANOSTEM_BASE=/some-path/ npm run build:web` overrides only the static build.
The Pages workflow derives its base from the repository name, so a pre-rename
deployment can still serve the old path and a post-rename dispatch uses the new one.

GitHub repository redirects preserve ordinary repository links after a rename,
but [GitHub explicitly excludes project-site URLs](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository).
This project cannot place a redirect at a sibling Pages path from its own Pages
artifact. No personal site, other repository or DNS configuration is changed.
The final audit records the observed old/new HTTP behavior. Prefer the new URL,
update bookmarks and do not create a second repository with the old name merely
to manufacture a redirect, because that would also alter GitHub redirect behavior.

The canonical Web address is **https://styayur.github.io/panostem/**. On 2026-10-24
the historical `/stem-visual-explorer/` Pages path still returned 404. A sibling path
cannot be restored by this repository's Pages artifact, and reusing the old repo
name would remove ordinary repository redirects. The accepted scoped decision is
to retain the old Pages limitation and update bookmarks, without another repo,
personal-site changes, custom DNS or an invented redirect claim.
