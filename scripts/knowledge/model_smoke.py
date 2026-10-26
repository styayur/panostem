"""CI math and rendering regression for application-owned recipes.

This tests the recipes only. It does not claim a live source corpus was sampled.
The live source/immutable evidence gate is sampling.py, a separate command.
"""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
from sample_models import MODEL_SPECS, HELPER, verify, scene_code

root=Path(__file__).resolve().parents[2]
runtime=root/'.panostem-runtime';worker=runtime/'worker'
shutil.copytree(root/'src-tauri/runtime',worker,dirs_exist_ok=True)
shutil.copyfile(root/'src/lib/concepts.json',worker/'concepts.json')
for name in ('FFmpeg-GPL-3.0.txt','PyOpenGL-3.1.10-LICENSE.txt'):shutil.copyfile(root/'licenses'/name,worker/name)
spec=importlib.util.spec_from_file_location('recipe_worker',worker/'controller.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
c.prepare_runtime({'runtime_root':str(runtime)})
results=[]
for kind in MODEL_SPECS:
    data=verify(kind)
    project=runtime/'model-regression'/kind;project.mkdir(parents=True,exist_ok=True)
    (project/'main.py').write_text(scene_code(kind,kind,data),encoding='utf-8')
    (project/'helpers.py').write_text(HELPER,encoding='utf-8')
    info=c.inspect_project(project)
    result=c.run_scene(project,{'runtime_root':str(runtime),'entry':'main.py','scene':'ModelScene','mode':'render','format':'mp4',
                               'resolution':'854x480','fps':15,'job_id':f'ci-{time.time_ns()}','trust':True,'revision':info['revision'],'parameters':{}})
    movie=next(m for m in result['media'] if m['path'].endswith('.mp4'))
    ffmpeg=runtime/'bin'/('ffmpeg.exe' if sys.platform=='win32' else 'ffmpeg')
    subprocess.run([str(ffmpeg),'-v','error','-i',str(project/movie['path']),'-f','null','-'],check=True,timeout=60,capture_output=True)
    results.append({'model':kind,'mathVerified':True,'rendered':True,'decoded':True,'bytes':movie['size'],'checks':data['checks']})
    sys.stdout.write(f'PASS independent model and actual render/decode: {kind}\n');sys.stdout.flush()
(runtime/'model-regression.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
