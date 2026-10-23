# Dependency license evidence

- `npm-inventory.json`: actual installed production npm packages, source URLs,
  lockfile integrity and collected notice filenames.
- `rust-build-inventory.json`: the locked Cargo dependency graph, including build
  and platform-specific crates; not every listed package ships in each binary.
- `python-runtime-inventory.json`: actual installed packages from the verified
  managed Python environment. An empty SPDX/License metadata field is recorded as
  UNDECLARED rather than guessed; the accompanying actual license texts govern.
- `THIRD_PARTY_LICENSE_TEXTS.txt`: collected actual package copyright/license texts.
- `supplemental-sources.json`: exact PyOpenGL source archive/hash and FFmpeg build/
  source/license provenance. The wheel omits the PyOpenGL standalone license;
  `PyOpenGL-3.1.10-LICENSE.txt` supplies the source archive's license files.
- `FFmpeg-GPL-3.0.txt`: complete GPLv3 text for the separately downloaded FFmpeg
  binary. Its own `-L` and build configuration are also collected during setup.

Regenerate installed-package evidence with:

```sh
python scripts/collect_licenses.py --runtime-python <managed-python>
```

Preserve supplemental files/provenance when regenerating. Bundled wheels retain
their own `.dist-info` notices. Runtime setup writes `THIRD_PARTY_LICENSES.txt` into
the managed runtime, including CPython/package notices and installed FFmpeg output.
The application's AGPL-3.0-only terms are in the root LICENSE. The inventory does
not relicense user scenes, rendered outputs, textbooks or other external content.
