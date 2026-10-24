"""Runs inside Windows Sandbox only; no host-side execution of imported files."""
import json
from pathlib import Path
import shutil
import traceback
import controller

output = Path(r"C:\PanostemOutput")
try:
    request = json.loads(Path(r"C:\PanostemInput\request.json").read_text(encoding="utf-8"))
    project = Path(r"C:\PanostemProject")
    shutil.copytree(Path(r"C:\PanostemInput\project"), project)
    info = controller.inspect_project(project)
    request.update(project=str(project), revision=info["revision"], trust=True, job_id="sandbox")
    result = controller.run_scene(project, request)
    for media in result["media"]:
        source = controller.inside(project, media["path"])
        shutil.copyfile(source, output / source.name)
    (output / "result.json").write_text(json.dumps(result, indent=2))
except Exception:
    (output / "error.txt").write_text(traceback.format_exc(), encoding="utf-8")
