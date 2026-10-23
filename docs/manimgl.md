# ManimGL authoring and runtime

Panostem runs **3b1b/manim (ManimGL)** as a separate process. It does not use Manim
Community, rewrite Python as JSON, require a proprietary Scene base class, or
patch upstream internals. Native preview is an OpenGL window. Rendered media is
shown in the app's player. JSXGraph remains the independent guided-lesson engine.

## Supported and experimental targets

| Target | Status |
| --- | --- |
| Windows 11 x64 | Local real rendering verified; primary installer/portable target |
| Linux x64 | Experimental; contract CI and Xvfb/Mesa real-render CI configured |
| macOS | Experimental; project/runtime contracts in CI, no native release claim |
| Static browser | Playback, metadata and escaped source only; no Python execution |
| Windows Sandbox | Experimental configuration export; optional system component absent on the verification host |

Runtime identity:

- CPython **3.11.14**; the application's installer manages it, not the system Python.
- ManimGL upstream tag **v1.7.2**, commit
  `f427fc67df75513be0cd3f3329e327a9a19401c3`.
- Source archive SHA-256:
  `e0768c38365f03222d728873c2a6d294c4bb09316f725e36ab1b0fc56bad2bb6`.
- The tagged `setup.cfg` and engine banner say **1.7.1**. This known upstream
  metadata discrepancy does not change the locked source commit.
- uv **0.13.5** Windows x64 ZIP SHA-256:
  `a38b8d1902b7cfbc76b423ba1bb456f623f42064cdc72628b6075b89afd1019a`.
- Transitive packages and wheel/source hashes: `src-tauri/runtime/requirements.lock`.

The tagged CLI's `--fps` option leaves a string in camera configuration and fails
during animation. Panostem supplies integer FPS through the official `--config_file`
overlay. `--resolution`, `--write_file`, `--video_dir`, `--file_name`,
`--skip_animations`, `--gif` and `--transparent` map to that exact source's parser.
The overlay disables mirrored output paths for predictable task directories while
preserving the project's other `custom_config.yml` settings.

## First setup

1. Open **ManimGL Studio** in the desktop app and expand **Managed runtime**.
2. Review and authorize the runtime download, then choose **Install / repair**.
3. Watch the task phases and logs. Installation downloads uv from GitHub, verified
   Python from python-build-standalone and pinned packages from PyPI/GitHub.
4. Use **Check environment** to inspect Python, source identity, dependency
   compatibility, OpenGL renderer, FFmpeg and optional LaTeX tools.
5. Enter a **new absolute project directory** and create the blank self-test
   project. Review trust and render it. A successful environment import alone
   does not prove that a graphics driver can render.

Allow approximately 2–4 GiB of free disk for interpreter, packages, download/build
cache and initial media; actual size varies by platform and cache. First setup
requires network, user-directory write access and permission to launch local
programs. It does not require global pip, change system Python/PATH, write Python
registration entries, or install executables into the user's global bin directory.
Repair reinstalls the managed environment; project files and application learning
data are outside it. Failed/cancelled setup can be retried; review the task error.

FFmpeg is supplied by the pinned imageio-ffmpeg wheel and copied to a private child
PATH. Windows ManimPango wheels supply their native stack. Linux needs Pango/Cairo
libraries and headers for installation. Rendering requires a working OpenGL 3.3
context; driver/RDP/headless behavior differs. LaTeX/dvisvgm are optional for Tex
objects. For installed native tools, enter their absolute executable directories
in **Optional native tool directories**; no global environment changes are needed.
The five shipped templates require no LaTeX.

## Project workflow

Create from blank, curves/transformations, three-dimensional geometry, oscillator,
or custom-class/updater templates. Alternatively open any ordinary local ManimGL
directory, or import a ZIP into a **new** directory. Opening/importing only reads
files and parses Python syntax; it never imports project modules or installs code.

```text
my-project/
  main.py                 # ordinary from manimlib import * scene
  helpers.py              # optional user modules/classes
  assets/                 # optional resources
  custom_config.yml       # ordinary upstream configuration
  requirements.txt        # optional reviewed project packages
  panostem.json           # optional integration metadata
  renders/<task-id>/       # managed output and run.json
  .panostem/               # private project venv, dependency lock and file trash
```

Use the file list and CodeMirror editor to switch/add/save Python and configuration
files. Source is syntax-highlighted, with line numbers, search, folding, indentation
and normal editor keyboard commands. Syntax diagnostics and traceback links select
the corresponding file/line. New assets are copied only after an explicit source
and destination selection. File removal moves the file to `.panostem/trash`, so it
can be restored manually. Unsaved file/project switching asks before discarding.

Scene candidates are found structurally without execution. Imported/dynamically
constructed scenes can be typed into the editable entry/class fields; candidate
discovery is not a restriction on the Python API. Save before running, then grant
trust for the current source revision. Edits revoke that grant.

**Native preview** starts the actual engine in a separate window. Use upstream
mouse/keyboard interactions. For scenes that enter an IPython embed, the Studio
console forwards line input using IPython's simple prompt mode. It is not a full
terminal emulator. **Stop process tree** stops the worker, engine and descendants.
There is no generic frame-seek or pause promise for arbitrary native scenes.

**Render video** supports MP4, GIF and transparent MOV, selected resolution and
integer FPS. **Render final frame** uses upstream's final-frame mode. The app shows
bounded stdout/stderr, elapsed time, completion/cancel/failure, actual output paths,
available frames and a generated thumbnail. MP4 is the portable browser choice;
MOV codec support depends on the player. History can reload completed outputs.
Old render directories can be deleted explicitly. Managed runs refuse to start
when existing render storage exceeds 2 GiB; user Python can itself write elsewhere.
One task runs at a time, logs are bounded to 256 KiB/4,096 chunks, history to 40
tasks, and long-running tasks time out after one hour.

## Project dependencies

Review `requirements.txt` before granting **separate dependency authorization**.
The managed installer accepts exact PyPI `name==version` declarations, resolves a
hash-locked project lockfile under `.panostem`, and uses an independent project venv
with access to the pinned base environment. Base constraints prevent incompatible
engine overrides. Only binary wheels are installed; arbitrary VCS URLs/build
scripts are not an automatic installation feature. Normal user Python modules
remain unrestricted. Dependency packages can execute code when imported, so this
is a trust decision even when a wheel install does not run a build script.

## Optional metadata and parameters

`panostem.json` version 1 requires `id`, `title`, `description`, `entry`, `scene`,
`license`, `concept_ids` and `learning_objectives`. Optional fields include
`prerequisites`, `source_ids`, `checkpoints` and `parameters`. Concept references
must exist in the existing ontology. Unknown IDs produce a diagnostic; no second
keyword resolver or invented concept is created. Imported/opened scene metadata
registers with the concept Workbench during the current session.

```json
{
  "version": 1,
  "id": "oscillator",
  "title": "A harmonic oscillator",
  "description": "Observe periodic motion",
  "entry": "main.py",
  "scene": "OscillatorScene",
  "license": "Unspecified",
  "concept_ids": ["simple-harmonic-motion"],
  "learning_objectives": ["Relate angular frequency to period"],
  "parameters": {
    "omega": {"type": "number", "min": 0.1, "max": 8, "default": 2}
  }
}
```

Parameters are explicit opt-in values, not inferred Python globals. Numeric,
integer, boolean and short-string types are checked, including bounds/defaults.
Scenes may read JSON from `os.environ.get("PANOSTEM_PARAMETERS", "{}")`, as the
oscillator example does. The scene remains runnable from an ordinary `manimgl`
command with its own defaults. Metadata and parameter panels do not execute Python.

## Sharing and static publication

`*.panostem.zip` contains a versioned `manifest.json` with `format: panostem-share`,
`version: 1`, scene metadata and an explicit `files` array. Every file entry has
`path`, `role`, `size`, `sha256` and `mime`. Roles are video, thumbnail, frame,
source and notice. Python inclusion is opt-in for the selected source file.
Private resources, venvs, caches, environment files and logs are never swept into
share export. A full **project** export is separate and explicitly includes source
and project assets, excluding generated/private environment/cache directories.

The Web importer checks archive structure, declared sizes, versions, paths,
case conflicts, symlinks, allowed MIME/extensions, file counts and SHA-256 before
creating media URLs. ZIP64, encrypted archives, extra unlisted content, HTML/SVG
payloads and path traversal are rejected. Share limits are 128 entries, 128 MiB
per file and 512 MiB total. Project archives allow 2,048 entries under the same
byte limits and are extracted into staging before moving to the new directory.

Web source is escaped text. No scripts in a package run, and no dependency installs
occur. Import/export is local. Export does not upload files or assign a permanent
public URL. Publish a share ZIP as a static asset on hosting you control, or deploy
this app's `dist/`; the committed oscillator example demonstrates that path:
`?route=studio&example=oscillator`. No cloud rendering/account service is used.

## Security and isolation

Local execution has the full file/network permissions of the current user. A venv,
AST inspection, subprocess and Windows Job Object are **not** a security sandbox.
Job Objects (Windows) and process groups (Unix) manage lifetime; secrets, tokens,
proxy credentials and PYTHONPATH are not inherited. Media uses scoped random
tokens, range responses and app-window checks; external WebViewers cannot use
the media protocol or application IPC. Existing URL/preview policies remain intact.

For an unknown project, use a disposable OS VM. Experimental **Windows Sandbox
export** creates a snapshot and `.wsb` file for manual launch, with networking,
clipboard, printers, audio/video input disabled. Runtime/input mounts are read-only;
only a dedicated output directory is writable on the host. vGPU is enabled for
OpenGL, which expands the shared attack surface. Windows Sandbox and virtualization
must already be enabled; the runtime must be on C:. GPU compatibility and VM
execution are not verified on the current host. Results remain untrusted files.
Close the Sandbox window to terminate it. No claim of formal isolation is made
for the ordinary local-run buttons.

References: [upstream source](https://github.com/3b1b/manim/tree/f427fc67df75513be0cd3f3329e327a9a19401c3),
[locked CLI parser](https://github.com/3b1b/manim/blob/f427fc67df75513be0cd3f3329e327a9a19401c3/manimlib/config.py),
[Microsoft Sandbox configuration](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file),
[license notices](../THIRD_PARTY_NOTICES.md).
