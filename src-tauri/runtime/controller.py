"""Panostem local worker. No project code is imported by inspect/save/archive.

This process is NOT an OS sandbox. Run and dependency operations require explicit
consent. Protocol uses a single JSON request on stdin and a final marked result.
"""
from __future__ import annotations

import ast
import hashlib
import importlib.metadata as metadata
import json
import keyword
import math
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import zipfile
import xml.etree.ElementTree as ET

SCHEMA = 1
UPSTREAM = "f427fc67df75513be0cd3f3329e327a9a19401c3"
MAX_FILE = 128 * 1024 * 1024
MAX_TOTAL = 512 * 1024 * 1024
MAX_FILES = 2048
TEXT_MAX = 2 * 1024 * 1024
IGNORED = {".git", ".venv", "venv", "__pycache__", ".env", "node_modules", ".panostem"}
EDITABLE = {".py", ".json", ".yaml", ".yml", ".txt", ".md", ".toml", ".cfg", ".ini", ".glsl", ".vert", ".frag", ".csv", ".tex"}
HERE = Path(__file__).resolve().parent


def digest(data):
    return hashlib.sha256(data).hexdigest()


def relative(name):
    if not isinstance(name, str) or not name or len(name) > 240:
        raise ValueError("Invalid project path")
    if "\\" in name or ":" in name or "\x00" in name or name.startswith("/"):
        raise ValueError("Absolute or platform-specific paths are forbidden")
    parts = name.split("/")
    for part in parts:
        if part in {"", ".", ".."} or part.endswith((" ", ".")) or any(ord(c) < 32 for c in part):
            raise ValueError("Unsafe path component")
        if re.fullmatch(r"(?i)(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\..*)?", part):
            raise ValueError("Reserved device path")
    return PurePosixPath(name)


def link_or_reparse(path):
    return path.is_symlink() or (path.exists() and bool(getattr(path.lstat(), "st_file_attributes", 0) & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)))


def project_root(value):
    p = Path(value).expanduser()
    if not p.is_absolute() or not p.is_dir() or link_or_reparse(p):
        raise ValueError("Select an existing absolute project directory")
    return p.resolve()


def inside(root, name):
    root = root.resolve()
    rel = relative(name)
    target = root.joinpath(*rel.parts)
    for parent in [target, *target.parents]:
        if parent == root:
            break
        if link_or_reparse(parent):
            raise ValueError("Symlinks and junctions are not allowed in managed files")
    if not target.resolve().is_relative_to(root):
        raise ValueError("Path leaves project")
    return target


def inventory(root, outputs=False):
    root = root.resolve()
    files, total = [], 0
    for base, dirs, names in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d.lower() not in IGNORED and (outputs or d.lower() != "renders"))
        for d in dirs:
            inside(root, (Path(base) / d).relative_to(root).as_posix())
        for name in sorted(names):
            rel = (Path(base) / name).relative_to(root).as_posix()
            if name.lower().startswith(".env") or any(p.lower() in IGNORED for p in PurePosixPath(rel).parts):
                continue
            path = inside(root, rel)
            size = path.stat().st_size
            total += size
            if size > MAX_FILE or total > MAX_TOTAL or len(files) >= MAX_FILES:
                raise ValueError("Project exceeds limits: 2048 files, 128 MiB/file, 512 MiB total")
            files.append({"path": rel, "size": size})
    return files


def validate_metadata(value):
    if not isinstance(value, dict) or value.get("version") != SCHEMA:
        raise ValueError("Unsupported scene metadata version; expected 1")
    if not isinstance(value.get("concept_ids"), list) or not isinstance(value.get("learning_objectives"), list):
        raise ValueError("Scene metadata requires concept_ids and learning_objectives arrays")
    for key in ("id", "title", "description", "entry", "scene", "license"):
        if not isinstance(value.get(key), str) or len(value[key]) > 8192:
            raise ValueError(f"Metadata {key} must be a string")
    relative(value["entry"])
    if not value["entry"].endswith(".py") or not value["scene"].isidentifier() or keyword.iskeyword(value["scene"]):
        raise ValueError("Invalid Python scene entry")
    concepts = {c["id"] for c in json.loads((HERE / "concepts.json").read_text(encoding="utf-8"))}
    for field in ("concept_ids", "prerequisites"):
        ids = value.get(field, [])
        if not isinstance(ids, list) or any(not isinstance(c, str) or c not in concepts for c in ids):
            raise ValueError(f"Unresolved concept ID in {field}")
    for field in ("learning_objectives", "source_ids", "checkpoints"):
        vals = value.get(field, [])
        if not isinstance(vals, list) or len(vals) > 128 or any(not isinstance(x, str) or len(x) > 8192 for x in vals):
            raise ValueError(f"Invalid {field}")
    specs = value.get("parameters", {})
    if not isinstance(specs, dict) or len(specs) > 32:
        raise ValueError("Invalid parameter definitions")
    for key, spec in specs.items():
        if not re.fullmatch(r"[A-Za-z_]\w{0,63}", key) or not isinstance(spec, dict):
            raise ValueError("Invalid parameter name")
        if spec.get("type") not in {"number", "integer", "boolean", "string"}:
            raise ValueError("Unsupported parameter type")
        if spec["type"] in {"number", "integer"}:
            lo, hi = spec.get("min"), spec.get("max")
            if any(type(v) not in (int, float) or not math.isfinite(v) for v in (lo, hi)) or lo > hi:
                raise ValueError("Numeric parameters require finite ordered bounds")
        parameter_values({key: spec}, {key: spec.get("default")})
    return value


def parameter_values(specs, values):
    if not isinstance(values, dict) or set(values) - set(specs):
        raise ValueError("Unknown parameter")
    result = {}
    for name, spec in specs.items():
        val = values.get(name, spec.get("default"))
        kind = spec["type"]
        if kind in {"number", "integer"}:
            if type(val) not in (int, float) or not math.isfinite(val) or not spec["min"] <= val <= spec["max"]:
                raise ValueError(f"Parameter {name} is outside its bounds")
            if kind == "integer" and type(val) is not int:
                raise ValueError(f"Parameter {name} must be an integer")
        elif kind == "boolean" and type(val) is not bool:
            raise ValueError(f"Parameter {name} must be boolean")
        elif kind == "string" and (not isinstance(val, str) or len(val) > 1024):
            raise ValueError(f"Parameter {name} must be a short string")
        result[name] = val
    return result


def inspect_project(root):
    root = root.resolve()
    files = inventory(root)
    scenes, classes, errors = [], [], []
    manifest = []
    metadata_bytes = None
    for item in files:
        path = inside(root, item["path"])
        content = path.read_bytes()
        item["sha256"] = digest(content)
        manifest.append({"path": item["path"], "sha256": item["sha256"]})
        if path == root / "panostem.json":
            metadata_bytes = content
        if path.suffix == ".py" and item["size"] <= TEXT_MAX:
            try:
                tree = ast.parse(content.decode("utf-8-sig"), filename=item["path"])
                aliases = {alias.asname or alias.name: alias.name for node in tree.body if isinstance(node, ast.ImportFrom) for alias in node.names}
                for node in tree.body:
                    if isinstance(node, ast.ClassDef):
                        bases = [base.id if isinstance(base, ast.Name) else base.attr for base in node.bases if isinstance(base, (ast.Name, ast.Attribute))]
                        classes.append({"file":item["path"],"name":node.name,"bases":[aliases.get(base,base) for base in bases]})
            except SyntaxError as e:
                errors.append({"file": item["path"], "line": e.lineno, "message": e.msg})
    # Resolve ordinary local Scene inheritance without importing modules. Mobjects
    # and Surface helpers are not scene candidates. Dynamic/external bases remain
    # runnable through the editable class field, so this is not an execution gate.
    known = {"Scene", "InteractiveScene"}
    for _ in range(len(classes) + 1):
        added = {item["name"] for item in classes if any(base in known for base in item["bases"])} - known
        if not added:
            break
        known.update(added)
    scenes = [{"file":item["file"],"name":item["name"]} for item in classes if any(base in known for base in item["bases"])]
    meta = None
    if metadata_bytes is not None:
        try:
            meta = validate_metadata(json.loads(metadata_bytes.decode("utf-8-sig")))
        except (ValueError, KeyError, TypeError) as e:
            errors.append({"file": "panostem.json", "line": 1, "message": str(e)})
    return {"root": str(root), "files": files, "scenes": scenes, "errors": errors,
            "metadata": meta, "revision": digest(json.dumps(
                {"scheme": 2, "files": sorted(manifest, key=lambda item: item["path"])},
                sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))}



def capture_execution(root, reviewed, destination):
    """Capture reviewed project bytes without importing any project code.

    The independent tree closes ordinary editor/filesystem mutation races. It is
    not immutable against arbitrary same-user OS code and is not an OS sandbox.
    """
    destination.mkdir(parents=True, exist_ok=False)
    try:
        for item in reviewed["files"]:
            source = inside(root, item["path"])
            target = inside(destination, item["path"])
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        captured = inspect_project(destination)
        if captured["revision"] != reviewed["revision"]:
            raise ValueError("Project changed during capture; review and authorize again")
        return captured
    except Exception:
        shutil.rmtree(destination)
        raise


def create_project(req):
    root = Path(req["project"]).expanduser()
    if not root.is_absolute() or root.exists():
        raise ValueError("Create requires a new absolute directory; existing files are never overwritten")
    template = req.get("template", "blank")
    if isinstance(template,str) and template.startswith("knowledge-"):
        catalog = json.loads((HERE/"examples/knowledge_catalog.json").read_text(encoding="utf-8"))
        if template not in catalog:
            raise ValueError("Unknown knowledge template")
        item = catalog[template]
        file = item["file"]
        if not re.fullmatch(r"knowledge_[a-z]+\.py",file):
            raise ValueError("Invalid bundled knowledge template path")
        meta = validate_metadata(item["metadata"])
        # Copy ordinary application-owned Python; creating/inspecting never imports it.
        source = inside(HERE/"examples",file).read_bytes()
        helper = inside(HERE/"examples","knowledge_helpers.py").read_bytes()
        root.mkdir(parents=True)
        (root/"main.py").write_bytes(source)
        (root/"helpers.py").write_bytes(helper)
        (root/"assets").mkdir()
        (root/"panostem.json").write_text(json.dumps(meta,indent=2),encoding="utf-8")
        for name in ("model","intent"):
            (root/f"{name}.json").write_text(json.dumps(item[name],indent=2),encoding="utf-8")
        (root/"requirements.txt").write_text("# Uses only the application-managed ManimGL runtime.\n",encoding="utf-8")
        return inspect_project(root.resolve())
    if template not in {"blank", "curves", "geometry3d", "physics", "updater"}:
        raise ValueError("Unknown template")
    root.mkdir(parents=True)
    shutil.copyfile(HERE / "examples" / f"{template}.py", root / "main.py")
    (root / "assets").mkdir()
    (root / "requirements.txt").write_text("# Optional project dependencies; install only after review.\n", encoding="utf-8")
    (root / "custom_config.yml").write_text("directories:\n  mirror_module_path: false\n", encoding="utf-8")
    names = {"blank": "BlankScene", "curves": "CurveScene", "geometry3d": "GeometryScene", "physics": "OscillatorScene", "updater": "UpdaterScene"}
    concepts = {"blank": [], "curves": ["sine-function"], "geometry3d": [], "physics": ["simple-harmonic-motion"], "updater": []}
    # Use only IDs actually present in the authoritative ontology.
    known = {c["id"] for c in json.loads((HERE / "concepts.json").read_text(encoding="utf-8"))}
    meta = {"version": 1, "id": root.name, "title": root.name, "description": "ManimGL scene project",
            "entry": "main.py", "scene": names[template], "license": "Unspecified",
            "concept_ids": [c for c in concepts[template] if c in known], "learning_objectives": [], "parameters": {}}
    if template == "physics":
        meta["parameters"] = {"omega": {"type": "number", "min": 0.1, "max": 8, "default": 2}}
    (root / "panostem.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return inspect_project(root.resolve())


def zip_entries(archive):
    if len(archive.infolist()) > MAX_FILES:
        raise ValueError("Too many archive entries")
    seen, total, entries = set(), 0, []
    for info in archive.infolist():
        name = info.filename.rstrip("/")
        relative(name)
        if name.casefold() in seen or ((info.external_attr >> 16) & 0o170000) == 0o120000:
            raise ValueError("Duplicate/case-conflicting path or symlink")
        seen.add(name.casefold())
        total += info.file_size
        if info.file_size > MAX_FILE or total > MAX_TOTAL or info.flag_bits & 1:
            raise ValueError("Archive is too large or encrypted")
        if not info.is_dir():
            entries.append((info, name))
    # A file must never also be a parent directory.
    names = {n.casefold() for _, n in entries}
    if any(str(p).casefold() in names for _, n in entries for p in PurePosixPath(n).parents if str(p) != "."):
        raise ValueError("Conflicting file/directory paths")
    return entries


def import_project(req):
    dest = Path(req["project"]).expanduser()
    if not dest.is_absolute() or dest.exists():
        raise ValueError("Import destination must be a new absolute directory")
    source = Path(req["archive"])
    if not source.is_file() or source.stat().st_size > MAX_TOTAL:
        raise ValueError("Select a project ZIP under 512 MiB")
    with zipfile.ZipFile(source) as z:
        entries = zip_entries(z)
        if any(any(p.lower() in IGNORED or p.lower().startswith(".env") for p in PurePosixPath(n).parts) for _, n in entries):
            raise ValueError("Project archive contains secrets, environment or cache files")
        dest.parent.mkdir(parents=True, exist_ok=True)
        stage = Path(tempfile.mkdtemp(prefix="panostem-import-", dir=dest.parent))
        try:
            for info, name in entries:
                out = inside(stage, name)
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(z.read(info))
            inspect_project(stage)
            stage.rename(dest)
        finally:
            if stage.exists():
                shutil.rmtree(stage)
    return inspect_project(dest.resolve())


def export_project(root, req):
    root = root.resolve()
    target = Path(req["archive"])
    if not target.is_absolute() or target.exists() or target.resolve().is_relative_to(root):
        raise ValueError("Export requires a new absolute ZIP path outside the project")
    files = inventory(root)
    with zipfile.ZipFile(target, "x", zipfile.ZIP_DEFLATED) as z:
        for item in files:
            z.write(inside(root, item["path"]), item["path"])
    return {"path": str(target), "sha256": digest(target.read_bytes()), "files": len(files)}


def python_for(root):
    return root / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def runtime_python(req):
    return python_for(Path(req["runtime_root"]) / "venv")


def safe_env(req):
    keys = {"SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "HOME", "USERPROFILE", "LOCALAPPDATA", "APPDATA",
            "DISPLAY", "XAUTHORITY", "LIBGL_ALWAYS_SOFTWARE", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR", "LANG", "LC_ALL"}
    env = {k: v for k, v in os.environ.items() if k.upper() in keys}
    base_python = runtime_python(req)
    tool_file = Path(req["runtime_root"]) / "tools.json"
    tool_paths = json.loads(tool_file.read_text()) if tool_file.exists() else []
    env.update({"PYTHONUTF8": "1", "PYTHONUNBUFFERED": "1", "PYTHONNOUSERSITE": "1",
                "PATH": os.pathsep.join([str(base_python.parent), str(Path(req["runtime_root"]) / "bin"),
                                        str(Path(os.environ.get("SYSTEMROOT", "/usr")) / ("System32" if os.name == "nt" else "bin")),
                                        "/usr/local/bin", *tool_paths]),
                "PANOSTEM_PARAMETERS": "{}"})
    env["UV_NO_CONFIG"] = "1"
    env["UV_CACHE_DIR"] = str(Path(req["runtime_root"]) / "cache")
    env["UV_PYTHON_INSTALL_DIR"] = str(Path(req["runtime_root"]) / "python")
    return env


def diagnostics(req):
    packages = {d.metadata["Name"]: d.version for d in metadata.distributions()}
    root = Path(req["runtime_root"])
    env = safe_env(req)
    stamp_path = root / "installed.json"
    stamp = json.loads(stamp_path.read_text()) if stamp_path.exists() else {}
    direct = json.loads(metadata.distribution("manimgl").read_text("direct_url.json") or "{}") if "manimgl" in packages else {}
    pinned = UPSTREAM in direct.get("url", "") and sys.version_info[:3] == (3, 11, 14)
    normalize = lambda name: re.sub(r"[-_.]+", "-", name).lower()
    actual = {normalize(k): v for k, v in packages.items()}
    from packaging.requirements import Requirement
    expected = {}
    for line in (HERE / "requirements.lock").read_text().splitlines():
        if re.match(r"^[A-Za-z0-9_.-]+==", line):
            requirement = Requirement(line.rstrip("\\").strip())
            if not requirement.marker or requirement.marker.evaluate():
                expected[requirement.name] = next(iter(requirement.specifier)).version
    mismatches = [{"package": name, "expected": version, "actual": actual.get(normalize(name))}
                  for name, version in expected.items() if actual.get(normalize(name)) != version]
    gl = subprocess.run([sys.executable, "-c", "import moderngl,json; c=moderngl.create_standalone_context(); print(json.dumps({k:c.info[k] for k in ('GL_VERSION','GL_RENDERER','GL_VENDOR')})); c.release()"],
                        env=env, capture_output=True, text=True, timeout=20)
    return {"python": sys.version, "executable": sys.executable, "upstream": UPSTREAM,
            "installed": "manimgl" in packages and pinned and not mismatches, "verified_install": stamp.get("upstream") == UPSTREAM and pinned and not mismatches,
            "compatibility_errors": mismatches,
            "source": direct, "opengl": gl.stdout.strip() if gl.returncode == 0 else gl.stderr[-2000:],
            "packages": packages, "ffmpeg": shutil.which("ffmpeg", path=env["PATH"]),
            "latex": shutil.which("latex", path=env["PATH"]), "dvisvgm": shutil.which("dvisvgm", path=env["PATH"]),
            "isolation": "Local user process; no filesystem/network sandbox", "platform": sys.platform}


def prepare_runtime(req):
    import imageio_ffmpeg
    root = Path(req["runtime_root"])
    (root / "bin").mkdir(exist_ok=True)
    target = root / "bin" / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
    shutil.copyfile(imageio_ffmpeg.get_ffmpeg_exe(), target)
    target.chmod(0o755)
    notices = []
    for dist in metadata.distributions():
        for entry in dist.files or []:
            if any(part.lower().startswith(("license", "licence", "copying", "notice")) for part in entry.parts):
                path = dist.locate_file(entry)
                if path.is_file() and path.stat().st_size < 2 * 1024 * 1024:
                    notices.append(f"\n=== {dist.metadata['Name']} {dist.version}: {entry} ===\n" + path.read_text(encoding="utf-8", errors="replace"))
    for path in Path(sys.base_prefix).glob("LICENSE*"):
        if path.is_file():
            notices.append("\n=== CPython distribution ===\n" + path.read_text(encoding="utf-8", errors="replace"))
    license_run = subprocess.run([str(target), "-L"], capture_output=True, text=True)
    notices.append("\n=== Installed FFmpeg license/build information ===\n" + license_run.stdout + license_run.stderr)
    for name in ("FFmpeg-GPL-3.0.txt", "PyOpenGL-3.1.10-LICENSE.txt"):
        supplement = HERE / name
        if supplement.exists():
            notices.append(f"\n=== {name} ===\n" + supplement.read_text(encoding="utf-8"))
    (root / "THIRD_PARTY_LICENSES.txt").write_text("\n".join(notices), encoding="utf-8")
    (root / "installed.json").write_text(json.dumps({"upstream": UPSTREAM, "python": sys.version,
                                                   "installed_at": time.time()}))
    return diagnostics(req)


def run_scene(root, req):
    if req.get("trust") is not True:
        raise ValueError("Explicit local-code execution authorization is required")
    current = inspect_project(root)
    if req.get("revision") != current["revision"]:
        raise ValueError("Project changed; review and authorize this revision before running")
    entry = inside(root, req["entry"])
    if entry.suffix != ".py" or not entry.is_file() or not req["scene"].isidentifier() or keyword.iskeyword(req["scene"]):
        raise ValueError("Select a Python file and a valid scene class")
    params = req.get("parameters", {})
    meta = current["metadata"]
    params = parameter_values(meta.get("parameters", {}) if meta else {}, params)
    size = req.get("resolution", "854x480")
    if not re.fullmatch(r"[0-9]{2,4}x[0-9]{2,4}", size):
        raise ValueError("Resolution must be WxH")
    w, h = map(int, size.split("x"))
    if w < 64 or h < 64 or w > 3840 or h > 2160 or w % 2 or h % 2:
        raise ValueError("Resolution must use even dimensions from 64x64 to 3840x2160")
    fps = req.get("fps", 30)
    if type(fps) is not int or not 1 <= fps <= 120:
        raise ValueError("FPS must be an integer from 1 to 120")
    mode = req.get("mode", "render")
    fmt = req.get("format", "mp4")
    if mode not in {"preview", "render", "frame"} or fmt not in {"mp4", "gif", "mov"}:
        raise ValueError("Unsupported output mode/format")
    project_env = inside(root, ".panostem/venv")
    py = python_for(project_env) if python_for(project_env).exists() else runtime_python(req)
    args = [str(py), "-m", "manimlib", str(entry), req["scene"], "--resolution", size]
    run_id = req["job_id"]
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", run_id):
        raise ValueError("Invalid task ID")
    output = inside(root, f"renders/{run_id}")
    renders = inside(root, "renders")
    existing_bytes = sum(p.stat().st_size for p in renders.rglob("*") if p.is_file()) if renders.exists() else 0
    if existing_bytes > 2 * 1024 * 1024 * 1024:
        raise ValueError("Render storage exceeds 2 GiB; delete old output before running again")
    output.mkdir(parents=True, exist_ok=False)
    # At this immutable tag argparse leaves --fps as a string. Use the official
    # config overlay with an integer instead; do not patch upstream internals.
    config = output / "panostem-run.yml"
    config.write_text(f"camera:\n  fps: {fps}\ndirectories:\n  mirror_module_path: false\n", encoding="utf-8")
    args += ["--config_file", str(config)]
    if mode != "preview":
        args += ["--write_file", "--video_dir", str(output), "--file_name", "scene"]
        if mode == "frame":
            args += ["--skip_animations"]
        elif fmt == "gif":
            args += ["--gif"]
        elif fmt == "mov":
            args += ["--transparent"]
    execution = output / ".execution"
    captured = capture_execution(root, current, execution)
    args[3] = str(inside(execution, req["entry"]))
    env = safe_env(req)
    env["PANOSTEM_PROJECT_DIR"] = str(root)
    env["PANOSTEM_OUTPUT_DIR"] = str(output)
    env["PANOSTEM_EXECUTION_DIR"] = str(execution)
    env["PATH"] = str(py.parent) + os.pathsep + env["PATH"]
    env["PANOSTEM_PARAMETERS"] = json.dumps(params, allow_nan=False)
    sys.stdout.write("Launching upstream ManimGL: " + json.dumps(args) + "\n")
    sys.stdout.flush()
    started = time.monotonic()
    if mode == "preview":
        ipython_dir = Path(req["runtime_root"]) / "ipython"
        (ipython_dir / "profile_default").mkdir(parents=True, exist_ok=True)
        (ipython_dir / "profile_default/ipython_config.py").write_text("c.TerminalInteractiveShell.simple_prompt = True\n")
        env["IPYTHONDIR"] = str(ipython_dir)
    proc = subprocess.run(args, cwd=execution, env=env, stdin=sys.stdin if mode == "preview" else subprocess.DEVNULL)
    if proc.returncode:
        raise RuntimeError(f"ManimGL exited with code {proc.returncode}. Review traceback and runtime diagnostics.")
    media = []
    for p in sorted(output.rglob("*")):
        if p.is_file() and p.suffix.lower() in {".mp4", ".gif", ".mov", ".png"} and "partial_movie_files" not in p.parts and ".execution" not in p.relative_to(output).parts:
            inside(root, p.relative_to(root).as_posix())
            if p.stat().st_size:
                media.append({"path": p.relative_to(root).as_posix(), "size": p.stat().st_size})
    if mode != "preview" and not media:
        raise RuntimeError("ManimGL exited without a non-empty media file")
    # Generate a real thumbnail without altering the upstream engine.
    movie = next((m for m in media if m["path"].endswith((".mp4", ".mov"))), None)
    if movie:
        thumb = output / "thumbnail.png"
        result = subprocess.run([str(Path(req["runtime_root"]) / "bin" / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")),
                                 "-y", "-i", str(root / movie["path"]), "-frames:v", "1", str(thumb)],
                                env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if result.returncode == 0 and thumb.exists():
            media.append({"path": thumb.relative_to(root).as_posix(), "size": thumb.stat().st_size})
    result = {"media": media, "output": str(output), "elapsed": time.monotonic() - started,
              "mode": mode, "entry": req["entry"], "scene": req["scene"], "revision": current["revision"],
              "metadata": meta, "parameters": params, "resolution": size, "fps": fps, "format": fmt,
              "revision_scheme": 2, "execution_root": str(execution), "source_manifest": captured["files"]}
    (output / "run.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def install_dependencies(root, req):
    if req.get("authorize_dependencies") is not True:
        raise ValueError("Separate dependency-install authorization is required")
    current = inspect_project(root)
    if current["revision"] != req.get("revision"):
        raise ValueError("Project changed since dependency review")
    path = inside(root, "requirements.txt")
    content = path.read_bytes()
    expected = next(item["sha256"] for item in current["files"] if item["path"] == "requirements.txt")
    if len(content) > TEXT_MAX or digest(content) != expected:
        raise ValueError("Requirements changed during review or exceed 2 MiB")
    lines = content.decode("utf-8-sig").splitlines()
    for line in lines:
        text = line.split("#", 1)[0].strip()
        if text and not re.fullmatch(r"[A-Za-z0-9_.-]+(?:\[[A-Za-z0-9_,.-]+\])?==[A-Za-z0-9_.+!-]+", text):
            raise ValueError("Managed dependency install requires one exact PyPI name==version per line")
    runtime = Path(req["runtime_root"])
    uv = str(runtime / ("uv.exe" if os.name == "nt" else "uv"))
    dest = inside(root, ".panostem/venv")
    env = safe_env(req)
    lock = inside(root, ".panostem/project-requirements.lock")
    review_root = runtime / "reviews"
    review_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="dependencies-", dir=review_root) as review:
        spec = Path(review) / "requirements.txt"
        spec.write_bytes(content)
        for args in ([uv, "venv", "--allow-existing", "--python", str(runtime_python(req)), "--system-site-packages", str(dest)],
                     [uv, "pip", "compile", str(spec), "--python", str(python_for(dest)), "--constraint", str(HERE / "requirements.lock"), "--generate-hashes",
                      "--only-binary", ":all:", "--index-url", "https://pypi.org/simple", "--output-file", str(lock)],
                     [uv, "pip", "install", "--python", str(python_for(dest)), "--only-binary", ":all:", "--require-hashes",
                      "--constraint", str(HERE / "requirements.lock"), "--index-url", "https://pypi.org/simple", "-r", str(lock)]):
            subprocess.run(args, cwd=HERE, env=env, check=True, stdin=subprocess.DEVNULL)
    return {"environment": str(dest), "requirements_sha256": digest(content), "lock": str(lock)}


def sandbox_config(runtime, bundle):
    config = ET.Element("Configuration")
    for key, value in {"VGpu":"Enable", "Networking":"Disable", "AudioInput":"Disable", "VideoInput":"Disable",
                       "PrinterRedirection":"Disable", "ClipboardRedirection":"Disable", "MemoryInMB":"8192"}.items():
        ET.SubElement(config,key).text=value
    folders=ET.SubElement(config,"MappedFolders")
    # Map only runtime components, never history/log/cache or the user's home.
    for name in ("python", "venv", "worker", "bin"):
        item=ET.SubElement(folders,"MappedFolder")
        path=str(runtime/name)
        ET.SubElement(item,"HostFolder").text=path
        ET.SubElement(item,"SandboxFolder").text=path
        ET.SubElement(item,"ReadOnly").text="true"
    for name, guest, readonly in (("input",r"C:\PanostemInput","true"),("output",r"C:\PanostemOutput","false")):
        item=ET.SubElement(folders,"MappedFolder")
        ET.SubElement(item,"HostFolder").text=str(bundle/name)
        ET.SubElement(item,"SandboxFolder").text=guest
        ET.SubElement(item,"ReadOnly").text=readonly
    command=ET.SubElement(ET.SubElement(config,"LogonCommand"),"Command")
    command.text=f'"{python_for(runtime / "venv")}" -I "{runtime / "worker/sandbox_runner.py"}"'
    return ET.tostring(config,encoding="unicode")


def export_sandbox(root,req):
    runtime=Path(req["runtime_root"])
    if os.name != "nt" or runtime.drive.upper() != "C:":
        raise ValueError("Experimental Windows Sandbox export requires the managed runtime on C:")
    dest=Path(req["sandbox_directory"])
    if not dest.is_absolute() or dest.exists() or dest.resolve().is_relative_to(root):
        raise ValueError("Sandbox export requires a new absolute directory outside the project")
    if '"' in str(runtime) or any(not (runtime/name).is_dir() for name in ("python","venv","worker","bin")):
        raise ValueError("Install the complete managed runtime before sandbox export")
    info=inspect_project(root)
    dest.mkdir(parents=True)
    (dest/"input/project").mkdir(parents=True)
    (dest/"output").mkdir()
    for item in info["files"]:
        target=dest/"input/project"/item["path"]
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(inside(root,item["path"]),target)
    request={k:req[k] for k in ("entry","scene","mode","format","resolution","fps","parameters") if k in req}
    request["runtime_root"]=str(runtime)
    (dest/"input/request.json").write_text(json.dumps(request),encoding="utf-8")
    (dest/"Panostem.wsb").write_text(sandbox_config(runtime,dest),encoding="utf-8")
    return {"path":str(dest/"Panostem.wsb"),"output":str(dest/"output"),
            "notice":"Experimental: Windows Sandbox optional feature and virtualization required. Networking/clipboard disabled; vGPU enabled for OpenGL. Only output folder is host-writable. Close the Sandbox window to terminate it. Results are untrusted files."}


def main(req):
    action = req["action"]
    if action == "diagnostics":
        return diagnostics(req)
    if action == "prepare_runtime":
        return prepare_runtime(req)
    if action == "configure_tools":
        paths = req.get("paths", [])
        if not isinstance(paths, list) or len(paths) > 8 or any(not isinstance(p, str) or not Path(p).is_absolute() or not Path(p).is_dir() for p in paths):
            raise ValueError("Provide up to eight existing absolute tool directories")
        (Path(req["runtime_root"]) / "tools.json").write_text(json.dumps(paths))
        return diagnostics(req)
    if action == "create":
        return create_project(req)
    if action == "import":
        return import_project(req)
    root = project_root(req["project"])
    if action == "inspect":
        return inspect_project(root)
    if action == "read_run_source":
        run_id = req["run_id"]
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", run_id):
            raise ValueError("Invalid run ID")
        relative(req["file"])
        record = json.loads(inside(root, f"renders/{run_id}/run.json").read_text(encoding="utf-8"))
        if record.get("revision_scheme") != 2:
            raise ValueError("Re-render this legacy output before sharing attested source")
        source = next((item for item in record.get("source_manifest", []) if item["path"] == req["file"]), None)
        path = inside(root, f"renders/{run_id}/.execution/{req['file']}")
        if not source or path.suffix != ".py" or path.stat().st_size > TEXT_MAX:
            raise ValueError("Select a captured Python source under 2 MiB")
        content = path.read_bytes()
        if digest(content) != source["sha256"]:
            raise ValueError("Captured source changed; re-render before sharing source")
        return {"text": content.decode("utf-8-sig")}
    if action == "read":
        path = inside(root, req["file"])
        if path.suffix not in EDITABLE or path.stat().st_size > TEXT_MAX:
            raise ValueError("Select a text file under 2 MiB")
        return {"text": path.read_text(encoding="utf-8-sig")}
    if action == "save":
        path = inside(root, req["file"])
        text = req["text"]
        if path.suffix not in EDITABLE or len(text.encode("utf-8")) > TEXT_MAX:
            raise ValueError("Unsupported text type or file too large")
        path.parent.mkdir(parents=True, exist_ok=True)
        # Replace rather than truncate to preserve files on interrupted saves.
        tmp = path.with_name(path.name + ".panostem-save")
        if tmp.exists():
            raise ValueError("A pending save exists; review it before retrying")
        with tmp.open("x", encoding="utf-8", newline="\n") as f:
            f.write(text)
        tmp.replace(path)
        return inspect_project(root)
    if action == "add_asset":
        source = Path(req["source"])
        target = inside(root, req["file"])
        if not source.is_absolute() or not source.is_file() or link_or_reparse(source) or source.stat().st_size > MAX_FILE or target.exists():
            raise ValueError("Select a regular source under 128 MiB and a new project destination")
        target.parent.mkdir(parents=True, exist_ok=True)
        with source.open("rb") as src, target.open("xb") as dst:
            shutil.copyfileobj(src, dst)
        return inspect_project(root)
    if action == "trash":
        source = inside(root, req["file"])
        if not source.is_file():
            raise ValueError("Select a project file")
        trash = inside(root, f".panostem/trash/{time.time_ns()}/{req['file']}")
        trash.parent.mkdir(parents=True)
        source.rename(trash)
        return inspect_project(root)
    if action == "export":
        return export_project(root, req)
    if action == "sandbox_export":
        return export_sandbox(root, req)
    if action == "run":
        return run_scene(root, req)
    if action == "dependencies":
        return install_dependencies(root, req)
    if action == "media":
        path = inside(root, req["file"])
        if not req["file"].startswith("renders/") or path.suffix not in {".mp4", ".png", ".gif", ".mov"} or path.stat().st_size > MAX_FILE:
            raise ValueError("Select rendered media under 128 MiB")
        # Rust serves bytes with a scoped protocol; never expose arbitrary files.
        return {"path": str(path), "size": path.stat().st_size}
    if action == "outputs":
        renders = inside(root, "renders")
        records = []
        if renders.exists():
            for p in sorted(renders.glob("*/run.json"), reverse=True)[:50]:
                inside(root, p.relative_to(root).as_posix())
                if p.stat().st_size <= TEXT_MAX:
                    records.append(json.loads(p.read_text(encoding="utf-8")))
        return records
    if action == "delete_output":
        name = req["file"]
        if not re.fullmatch(r"renders/[a-zA-Z0-9_-]{1,80}", name):
            raise ValueError("Select one render task directory")
        path = inside(root, name)
        if not path.is_dir():
            raise ValueError("Output directory is missing")
        shutil.rmtree(path)
        return {"deleted": name}
    raise ValueError("Unknown Studio operation")


if __name__ == "__main__":
    try:
        request = json.loads(sys.stdin.readline(TEXT_MAX * 2))
        result = main(request)
        sys.stdout.write("PANOSTEM_RESULT:" + json.dumps({"ok": True, "data": result}) + "\n")
        sys.stdout.flush()
    except Exception as error:
        sys.stdout.write("PANOSTEM_RESULT:" + json.dumps({"ok": False, "error": str(error)}) + "\n")
        sys.stdout.flush()
        sys.exit(1)
