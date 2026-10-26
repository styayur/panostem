"""Run frozen, source-grounded samples with independent math + actual ManimGL + FFmpeg.

Uses only reviewed application-owned recipes, never imported source code. Run
with the existing managed Python and --allow-execution. Source bodies/media stay
under the ignored runtime directory. A failed test can never create a binding.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
from sample_models import verify, scene_code, model_definition, HELPER

parser = argparse.ArgumentParser()
parser.add_argument('--allow-execution', action='store_true')
parser.add_argument('--corpus', default='.panostem-runtime/vextessera-corpus')
parser.add_argument('--runtime-root', default='.panostem-runtime')
args = parser.parse_args()
if not args.allow_execution:
    raise SystemExit('Application-owned generated source execution requires --allow-execution')
root = Path(__file__).resolve().parents[2]
corpus = (root / args.corpus).resolve()
runtime = (root / args.runtime_root).resolve()
worker = runtime / 'worker'
shutil.copytree(root / 'src-tauri/runtime', worker, dirs_exist_ok=True)
shutil.copyfile(root / 'src/lib/concepts.json', worker / 'concepts.json')
for name in ('FFmpeg-GPL-3.0.txt', 'PyOpenGL-3.1.10-LICENSE.txt'):
    shutil.copyfile(root / 'licenses' / name, worker / name)
spec = importlib.util.spec_from_file_location('vextessera_controller', worker / 'controller.py')
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
c.prepare_runtime({'runtime_root': str(runtime)})
units = {}
for file in corpus.glob('*.json'):
    document = json.loads(file.read_text(encoding='utf-8'))
    if isinstance(document, dict):
        for record in document.get('records', []):
            units.update((u['id'], u) for u in record.get('units', []))


def pick(source, path, line, fragment):
    candidates = [u for u in units.values() if u['sourceId'] == f'github:{source.lower()}' and u['location']['path'] == path and u['location']['startLine'] == line]
    if len(candidates) != 1:
        raise ValueError(f'Reviewed source locator missing/ambiguous: {source}/{path}:{line}')
    u = candidates[0]
    formula = next((f for f in u['formulas'] if fragment in f['expression']), None)
    if formula is None:
        raise ValueError(f'Reviewed mathematical evidence changed: {u["id"]}')
    return {**u, '_reviewedFormula': formula['expression']}


recipes = [
    ('newton', 'Newton iteration: x squared minus four', [('djeada/Numerical-Methods', 'notes/1_root_and_extrema_finding/newtons_method.md', 161, 'x^2 - 4')]),
    ('bisection', 'Bisection: bracket and error bound', [('djeada/Numerical-Methods', 'notes/1_root_and_extrema_finding/bisection_method.md', 150, 'x^2 - 4')]),
    ('oscillator', 'Harmonic oscillator: phase and conserved energy', [('djeada/Numerical-Methods', 'notes/7_ordinary_differential_equations/ordinary_differential_equations.md', 302, r'\omega^2x')]),
    ('gradient', 'Gradient descent on a derived quadratic surface', [('djeada/Numerical-Methods', 'notes/1_root_and_extrema_finding/gradient_descent.md', 40, r'x_{k+1} = x_k - \alpha \nabla f(x_k)')]),
    ('square', 'Complex squaring: angle and radius', [('PKM-er/Pkmer-Math', 'Other/复分析/共形映射/共形映射.md', 15, 'w = z^2')]),
    ('polar', 'Polar form of a complex number', [('theophilec/complex-analysis', 'chapter-1.tex', 1, r'R\exp(i\theta)')]),
    ('linear', 'Linear map: determinant and inverse', [('PKM-er/Pkmer-Math', '线性代数/行列式/行列式概述.md', 1, 'ad - bc'), ('ApurbaKumarNath/numerical-methods-python', '01_Solving_Linear_Systems/Gaussian_Elimination_and_Matrix_Inverse.ipynb', 11, 'A^{-1}A = I')]),
    ('union', 'Inclusion-exclusion for overlapping events', [('MaksimIM/JaynesProbabilityTheory', 'chapter2.md', 487, 'P(A)+P(B)-P(AB)'), ('VincentC75/MIT_SDSMM', 'MIT_Probability_Statistics.Rmd', 1, r'P(A \cup B) = P(A) + P(B) - P(A \cap B)')]),
    ('means', 'Harmonic, geometric, arithmetic and quadratic means', [('GorCat/note_math', '初等函数/常用定理.md', 9, r'H_{n}\leq G_{n}\leq A_{n}\leq Q_{n}')]),
    ('wave', 'Standing wave: fixed boundaries and PDE residual', [('djeada/Numerical-Methods', 'notes/7_ordinary_differential_equations/partial_differential_equations.md', 110, 'u_{tt} = c^2u_{xx}')]),
    ('heat', 'Thermal diffusion: decay of a sine mode', [('djeada/Numerical-Methods', 'notes/7_ordinary_differential_equations/partial_differential_equations.md', 90, r'u_t = \alpha u_{xx}')]),
]
frozen_path = corpus / 'reviewed-model-samples.json'
frozen = json.loads(frozen_path.read_text()) if frozen_path.exists() else None
results = []
bindings = []
freeze = []
for kind, title, locations in recipes:
    result = {'model': kind, 'title': title, 'mathVerified': False, 'rendered': False, 'decoded': False, 'rightsCleared': False}
    start = time.monotonic()
    try:
        evidence = [pick(*location) for location in locations]
        hashes = {u['id']: u['contentHash'] for u in evidence}
        frozen_entry = {'model': kind, 'sourceHashes': hashes}
        if frozen is not None and frozen_entry not in frozen:
            raise ValueError('Source revision differs from frozen reviewed samples; explicit re-review required')
        freeze.append(frozen_entry)
        result['sources'] = [{'id': u['id'], 'origin': u['origin'], 'revision': u['revision'], 'contentHash': u['contentHash'], 'location': u['location']} for u in evidence]
        data = verify(kind)
        result['mathVerified'] = True
        result['verification'] = data['checks']
        result['verificationHash'] = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
        project = corpus / 'samples' / kind
        project.mkdir(parents=True, exist_ok=True)
        code = scene_code(kind, title, data)
        (project / 'main.py').write_text(code, encoding='utf-8')
        (project / 'helpers.py').write_text(HELPER, encoding='utf-8')
        concepts = sorted({id for u in evidence for id in u['conceptIds']})
        metadata = {'version': 1, 'id': f'knowledge-{kind}', 'title': title, 'description': 'Independently authored mathematical example; concrete parameter choices are derived, not attributed to source.',
                    'entry': 'main.py', 'scene': 'ModelScene', 'license': 'AGPL-3.0-only', 'concept_ids': concepts,
                    'learning_objectives': data['checks'], 'source_ids': sorted({u['sourceId'] for u in evidence})}
        (project / 'scene.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
        model = model_definition(kind, concepts, evidence, data, result['verificationHash'])
        (project / 'model.json').write_text(json.dumps(model, indent=2), encoding='utf-8')
        intent = {'schemaVersion':1,'unitIds':[u['id'] for u in evidence],'modelId':kind,'dimensions':'3d' if kind=='gradient' else '2d',
                  'stages':['Define objects and assumptions','Show mathematical relationship','Inspect invariant and source'],
                  'objects':model['equations'],'templateId':kind,'verificationRequirements':data['checks'],'trust':'reviewed'}
        (project / 'intent.json').write_text(json.dumps(intent, indent=2), encoding='utf-8')
        result['generationSeconds'] = time.monotonic() - start
        info = c.inspect_project(project)
        rendered = c.run_scene(project, {'runtime_root': str(runtime), 'entry': 'main.py', 'scene': 'ModelScene', 'mode': 'render', 'format': 'mp4',
                                        'resolution': '854x480', 'fps': 15, 'job_id': f'sample-{time.time_ns()}', 'trust': True, 'revision': info['revision'], 'parameters': {}})
        movie = next(m for m in rendered['media'] if m['path'].endswith('.mp4'))
        result['rendered'] = True
        ffmpeg = runtime / 'bin' / ('ffmpeg.exe' if sys.platform == 'win32' else 'ffmpeg')
        subprocess.run([str(ffmpeg), '-v', 'error', '-i', str(project / movie['path']), '-f', 'null', '-'], check=True, timeout=60, capture_output=True)
        result.update({'decoded': True, 'movie': str(project / movie['path']), 'bytes': movie['size'], 'renderSeconds': rendered['elapsed'], 'python': str(project / 'main.py'), 'projectRevision': info['revision']})
        binding = {'id': f'knowledge-{kind}', 'modelId': kind, 'modelVersion': 1, 'semanticKey': hashlib.sha256((kind + json.dumps(data, sort_keys=True)).encode()).hexdigest(),
                   'unitIds': [u['id'] for u in evidence], 'sourceHashes': hashes, 'conceptIds': concepts, 'entry': 'main.py', 'scene': 'ModelScene',
                   'verifiedFormulas': {u['id']: [u['_reviewedFormula']] for u in evidence}, 'coverageScope': 'Listed equations and derived example only; not every claim in the source unit',
                   'mathVerified': True, 'rendered': True, 'decoded': True, 'rightsCleared': False}
        bindings.append(binding)
        result['status'] = 'verified-local-scene'
    except Exception as e:
        result.update({'status': 'failed', 'error': str(e)})
    result['elapsedSeconds'] = time.monotonic()-start
    results.append(result)
    sys.stdout.write(f'{kind}: {result["status"]}; math={result["mathVerified"]}, render={result["rendered"]}, decode={result["decoded"]}\n');sys.stdout.flush()
    (corpus / 'sample-results.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
    (corpus / 'verified-scenes.json').write_text(json.dumps(bindings, indent=2), encoding='utf-8')
if frozen is None:
    frozen_path.write_text(json.dumps(freeze, indent=2), encoding='utf-8')
if any(r['status'] == 'failed' for r in results):
    raise SystemExit(1)
