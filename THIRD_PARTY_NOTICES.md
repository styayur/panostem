# Third-party notices

Panostem application source remains **AGPL-3.0-only**. The desktop bundle identifier
and existing copyright notices are preserved. The complete application license is
in `LICENSE`, and the corresponding source is available in this repository/tag.

## Distributed frontend and native application

- React, CodeMirror 6, @uiw/react-codemirror, Zustand, Lucide and fflate: MIT
  (individual package notices are included in `licenses/`).
- JSXGraph 1.13.3: LGPL-3.0-or-later OR MIT; this application uses the MIT option.
  Its executable expression parsers are excluded from the production bundle.
- KaTeX: MIT, with its font and bundled component notices retained.
- Tauri and the Rust dependency graph: see the actual package license expressions
  and notices in `licenses/rust-build-inventory.json` and the consolidated texts.
  That inventory includes build and platform-specific dependencies as well as
  linked dependencies; it does not imply every crate is shipped on every platform.

`licenses/npm-inventory.json` records installed production package versions,
registry origins, integrity fields and notice filenames. `Cargo.lock` records Rust
registry checksums. `licenses/THIRD_PARTY_LICENSE_TEXTS.txt` contains the actual
collected copyright/license texts. Regenerate with `scripts/collect_licenses.py`.
Missing/UNDECLARED metadata is disclosed; do not infer a license from a name.

## Separately installed ManimGL runtime

The normal installer does not contain Python, uv, ManimGL, FFmpeg, Pango or LaTeX.
Runtime installation is a separate explicit download action.

- ManimGL is **3b1b/manim**, MIT, immutable tag v1.7.2 at
  `f427fc67df75513be0cd3f3329e327a9a19401c3`. Its tagged package metadata and banner
  report 1.7.1; the immutable source identity, not the banner, identifies this build.
- uv 0.13.5: MIT OR Apache-2.0. Its Windows download is checked against a pinned
  SHA-256 before execution. It downloads verified python-build-standalone CPython
  3.11.14; the Python distribution retains PSF and bundled-library notices.
- Python dependencies are pinned with source/wheel hashes in
  `src-tauri/runtime/requirements.lock`. Actual installed package metadata and
  license file references are in `licenses/python-runtime-inventory.json`.
- imageio-ffmpeg 0.6.0's Python wrapper is BSD-2-Clause. Its included FFmpeg binary
  is GPL-licensed and separately governed; the GPL/source/build references shipped
  by the wheel are retained. FFmpeg is copied only into the managed runtime's
  private `bin` directory. See [imageio-ffmpeg](https://github.com/imageio/imageio-ffmpeg)
  and the binary's own `ffmpeg -L` / `ffmpeg -buildconf` output.
- manimpango and its bundled native Pango/Cairo-related components have their own
  LGPL/MIT/BSD notices. Their actual wheel license files are retained and collected.
- The PyOpenGL 3.1.10 wheel omits a standalone license text. Its exact PyPI source
  archive was checked with SHA-256 and its license files are supplied separately
  as `licenses/PyOpenGL-3.1.10-LICENSE.txt`; provenance is recorded in
  `licenses/supplemental-sources.json`. Full GPLv3 text for the downloaded FFmpeg
  binary is supplied as `licenses/FFmpeg-GPL-3.0.txt`. Runtime setup also collects
  installed notices and the binary's own license/build output locally.
- LaTeX/dvisvgm are optional user-selected native tools, not application assets.

Downloaded wheels retain their `.dist-info` license files. Do not remove those
directories when copying an environment. Runtime diagnostics expose package and
source identities; installing project dependencies requires separate authorization.

## User content and external sources

The application license does **not** automatically determine the rights in user
Python scenes, rendered videos, private resources, external simulations or textbooks.
Share metadata must state the applicable content license and preserve third-party
attribution. An unspecified license is not permission to redistribute. Textbook
references are external metadata; textbooks are not bundled.

The bundled demonstration video is generated from this repository's example
source. Its share manifest explicitly states the example's license. Screenshots
show the actual application and do not certify third-party service uptime.
