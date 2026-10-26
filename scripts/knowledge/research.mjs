import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { writeJson, hash } from './local.mjs';
const exec = promisify(execFile);
if (!process.argv.includes('--allow-network')) throw new Error('Explicit --allow-network required');
const dir = path.resolve(import.meta.dirname, '../../.panostem-runtime/vextessera-corpus/references');
const modules = {
  'remarkjs/remark': ['packages/remark-parse/lib/index.js'],
  'jupyter-book/mystmd': ['packages/myst-parser/src/index.ts', 'packages/myst-parser/src/math.ts'],
  'executablebooks/MyST-Parser': ['myst_parser/parsers/mdit.py'],
  'microsoft/markitdown': ['packages/markitdown/src/markitdown/_markitdown.py'],
  'benmaster82/Kwipu': ['bridge/graph.py', 'bridge/models.py'],
  'AmirhosseinHonardoust/Graph-RAG-Engine': ['graph/graph_store.py'],
  'mathigon/textbooks': ['content/linear-functions/functions.ts'],
  'sympy/sympy': ['sympy/solvers/ode/ode.py'],
  '3b1b/manim': ['manimlib/scene/scene.py'],
  'jeertmans/manim-slides': ['manim_slides/slide/manimlib.py', 'manim_slides/slide/base.py'],
  'ManimCommunity/manim_editor': ['manim_editor/project.schema.json'],
  'Matheart/manim-physics': ['manim_physics/electromagnetism/electrostatics.py'],
};
const report = [];
for (const [repo, paths] of Object.entries(modules)) {
  const audit = JSON.parse(await fs.readFile(path.join(dir, `${repo.replace('/', '__')}.json`)));
  for (const module of paths) {
    const result = await exec('gh', ['api', `repos/${repo}/contents/${module}?ref=${audit.revision}`], { timeout: 30000, maxBuffer: 8_000_000 });
    const data = JSON.parse(result.stdout), text = Buffer.from(data.content, 'base64').toString('utf8');
    await fs.mkdir(path.join(dir, 'modules', repo.replace('/', '__')), { recursive: true });
    await fs.writeFile(path.join(dir, 'modules', repo.replace('/', '__'), module.replaceAll('/', '__')), text, { mode: 0o600 });
    report.push({ repo, revision: audit.revision, module, bytes: Buffer.byteLength(text), contentHash: hash(text),
      interfaceLines: text.split('\n').filter(line => /export |^class |^def |^    def |from manim|import manim|next_slide|mdast|fromMarkdown|convert_stream|networkx|sphinx|sympy/.test(line)).slice(0, 35) });
  }
  process.stdout.write(`Read actual modules: ${repo}\n`);
}
await writeJson(path.join(dir, 'module-review.json'), report);
