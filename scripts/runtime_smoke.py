"""Real upstream rendering and media decoding. Run using the managed interpreter.

python scripts/runtime_smoke.py --runtime-root .panostem-runtime
No mock engine; requires an actual OpenGL context and installed locked packages.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

parser=argparse.ArgumentParser()
parser.add_argument("--runtime-root",default=".panostem-runtime")
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
runtime=Path(args.runtime_root).resolve()
worker=runtime/"worker"
shutil.copytree(root/"src-tauri/runtime",worker,dirs_exist_ok=True)
shutil.copyfile(root/"src/lib/concepts.json",worker/"concepts.json")
for name in ("FFmpeg-GPL-3.0.txt","PyOpenGL-3.1.10-LICENSE.txt"):
    shutil.copyfile(root/"licenses"/name,worker/name)
spec=importlib.util.spec_from_file_location("panostem_worker",worker/"controller.py")
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
c.prepare_runtime({"runtime_root":str(runtime)})
evidence=[]
for template in ("blank","curves","geometry3d","physics","updater"):
    project=runtime/f"smoke-{template}-{int(time.time())}"
    info=c.create_project({"project":str(project),"template":template})
    # Validate multi-file user classes, not only built-in examples.
    if template=="updater":
        source=(project/"main.py").read_text()
        start=source.index("class UpdaterScene")
        (project/"helpers.py").write_text(source[:start])
        (project/"main.py").write_text("from manimlib import *\nfrom helpers import OrbitingDot\n\n"+source[start:])
        info=c.inspect_project(project)
    result=c.run_scene(project,{"runtime_root":str(runtime),"entry":"main.py","scene":info["metadata"]["scene"],
                               "mode":"render","format":"mp4","resolution":"854x480","fps":15,
                               "job_id":"smoke","trust":True,"revision":info["revision"],"parameters":{}})
    movie=next(m for m in result["media"] if m["path"].endswith(".mp4"))
    ffmpeg=runtime/"bin"/("ffmpeg.exe" if sys.platform=="win32" else "ffmpeg")
    subprocess.run([str(ffmpeg),"-v","error","-i",str(project/movie["path"]),"-f","null","-"],check=True,timeout=60)
    evidence.append({"template":template,"movie":str(project/movie["path"]),"bytes":movie["size"],"elapsed":result["elapsed"],"decoded":True})
    sys.stdout.write(f"PASS: {template}: {movie['size']} bytes, decoded by real FFmpeg\n"); sys.stdout.flush()
formats=[]
project=Path(evidence[0]["movie"]).parents[2]
info=c.inspect_project(project)
for fmt,mode in (("gif","render"),("mov","render"),("mp4","frame")):
    result=c.run_scene(project,{"runtime_root":str(runtime),"entry":"main.py","scene":"BlankScene",
                               "mode":mode,"format":fmt,"resolution":"854x480","fps":15,
                               "job_id":f"format-{fmt}-{mode}","trust":True,"revision":info["revision"],"parameters":{}})
    media=next(m for m in result["media"] if not m["path"].endswith("thumbnail.png"))
    subprocess.run([str(ffmpeg),"-v","error","-i",str(project/media["path"]),"-f","null","-"],check=True,timeout=60)
    formats.append({"format":fmt,"mode":mode,"bytes":media["size"],"decoded":True})
    sys.stdout.write(f"PASS: {fmt}/{mode}: actual media decoded\n"); sys.stdout.flush()
(runtime/"smoke-evidence.json").write_text(json.dumps({"python":sys.version,"upstream":c.UPSTREAM,"renders":evidence,"formats":formats},indent=2))
sys.stdout.write("Real ManimGL smoke: all five scenes rendered and decoded\n")
