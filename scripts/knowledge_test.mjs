import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseDocument } from '../src/knowledge/parse.ts';
import { conceptById } from '../src/lib/concepts.ts';
import { VisualKnowledgeRegistry, dispositions } from '../src/knowledge/types.ts';
import { githubSources } from '../src/knowledge/sources.ts';
import { KnowledgeSourceAdapter, hash, writeJson } from './knowledge/local.mjs';
const input = (text, file = 'notes.md') => ({ sourceId: 'local:test', path: file, origin: file, revision: 'a'.repeat(40), contentHash: hash(text), text });
const tests = [];
function test(name, fn) { tests.push([name, fn]); }
test('all 15 repositories are explicit and unique; unavailable identities are retained', () => {
  assert.equal(githubSources.length, 15); assert.equal(new Set(githubSources).size, 15);
  assert.ok(githubSources.includes('e0328/Essence-of-Linear-Algebra'));
});
test('CommonMark AST preserves exact source lines and formula values', () => {
  const units = parseDocument(input('# Gradient\n\nThe gradient is $\\nabla f$.\n\n## Derivative\n\n$$\nf(x)=x^2\n$$\n'));
  assert.equal(units.length, 2); assert.equal(units[0].formulas[0].expression, '\\nabla f');
  assert.equal(units[0].formulas[0].location.startLine, 3); assert.equal(units[1].formulas[0].location.startLine, 7);
  assert.ok(units[0].conceptIds.includes('gradient')); assert.ok(units.every(u => u.conceptIds.every(id => conceptById.has(id))));
});
test('Obsidian references, aliases, embeds, callouts and frontmatter are preserved without file reads', () => {
  const [u] = parseDocument(input('---\ntitle: notes\n---\n# Notes\n> [!note]\n> [[Target#part|label]] ![[asset.png]]\n'));
  // Frontmatter has its own source block before the heading.
  const units = parseDocument(input('# Notes\n> [!note]\n> [[Target#part|label]] ![[asset.png]]'));
  assert.ok(u.text.includes('title: notes'));
  assert.ok(units[0].references.some(r => r.target === 'Target#part'));
  assert.ok(units[0].references.some(r => r.target === 'asset.png' && r.kind === 'obsidian-embed'));
});
test('code fences and inline code are never treated as mathematical equations or WikiLinks', () => {
  const [u] = parseDocument(input('# Code\n```python\nopen("secret").read()\n$fake$ [[NotALink]]\n```\n`$also_fake$`'));
  assert.equal(u.formulas.length, 0); assert.equal(u.references.length, 0);
});
test('MyST directives are preserved as partial, not executed or claimed fully parsed', () => {
  const [u] = parseDocument(input('# Test\n:::{include} /private/file\n:::'));
  assert.equal(u.format, 'myst-markdown'); assert.equal(u.parseStatus, 'partial'); assert.ok(u.errors.length);
});
test('TeX formula environments and include/citation references remain inert', () => {
  const [u] = parseDocument(input('\\input{../../secret}\n\\begin{equation}E=mc^2\\end{equation}\n\\cite{paper}', 'document.tex'));
  assert.equal(u.formulas[0].expression, 'E=mc^2'); assert.equal(u.references[0].target, '../../secret'); assert.equal(u.parseStatus, 'partial');
});
test('R Markdown leaves executable chunks inert', () => {
  const [u] = parseDocument(input('# Newton\n$x^2$\n```{r}\nsystem("evil")\n```', 'test.Rmd'));
  assert.equal(u.format, 'r-markdown'); assert.equal(u.formulas.length, 1);
});
test('Notebook Markdown preserves cell locator; code, outputs and attachments are excluded', () => {
  const units = parseDocument(input(JSON.stringify({ cells: [ { cell_type: 'code', source: 'raise Exception()', outputs: [] }, { cell_type: 'markdown', source: ['# Probability\n', '$P(A)$'], attachments: { secret: {} } }] }), 'test.ipynb'));
  assert.equal(units.length, 1); assert.equal(units[0].location.cell, 1); assert.equal(units[0].formulas[0].expression, 'P(A)'); assert.ok(!units[0].text.includes('raise'));
});
test('HTML parsing excludes scripts and navigation; scripts cannot run', () => {
  const [u] = parseDocument(input('<nav>Noise</nav><h1>Gradient</h1><script>globalThis.pwned=true</script><p>\\(f(x)=x^2\\)</p><iframe src="https://evil.test"></iframe>', 'test.html'));
  assert.ok(!u.text.includes('Noise')); assert.ok(!u.text.includes('pwned')); assert.equal(globalThis.pwned, undefined); assert.equal(u.formulas.length, 1);
});
test('malformed notebooks, binary data and oversized inputs fail explicitly', () => {
  assert.throws(() => parseDocument(input('{', 'bad.ipynb'))); assert.throws(() => parseDocument(input('a\0b')));
  assert.throws(() => parseDocument(input('x'.repeat(2_000_001)))); assert.deepEqual(parseDocument(input('binary', 'scan.pdf')), []);
});
test('HTML MathJax TeX and MathML are extracted statically with real source lines', () => {
  const [u] = parseDocument(input('<h1>Derivative</h1>\n<script type="math/tex; mode=display">f\'(x)=2x</script>\n<math><mi>x</mi></math><script>throw Error()</script>', 'math.html'));
  assert.equal(u.formulas.length, 2); assert.equal(u.formulas[0].expression, "f'(x)=2x"); assert.equal(u.formulas[0].location.startLine, 2);
  assert.equal(u.formulas[1].representation, 'mathml'); assert.ok(u.formulas[1].expression.includes('<mi>x</mi>'));
});
test('registry rejects unverified or undecoded scenes and detects source changes', () => {
  const registry = new VisualKnowledgeRegistry();
  const scene = { id: 'test', modelId: 'm', modelVersion: 1, semanticKey: 'assumptions+equations', unitIds: ['u'], sourceHashes: { u: 'hash' }, conceptIds: ['gradient'], entry: 'main.py', scene: 'Demo', mathVerified: true, rendered: true, decoded: true, rightsCleared: false };
  assert.throws(() => registry.register({ ...scene, decoded: false })); assert.throws(() => registry.register({ ...scene, mathVerified: false }));
  registry.register(scene); assert.equal(registry.find(scene.semanticKey, 1), scene); assert.equal(registry.find(scene.semanticKey, 2), undefined);
  assert.equal(registry.stale('test', { u: 'new' }), true); assert.equal(registry.stale('test', { u: 'hash' }), false);
});
test('read-only filesystem adapter records bad encodings, unsupported media and ignores dependency folders', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'vextessera-knowledge-'));
  const source = path.join(temp, 'source'), out = path.join(temp, 'out'); await fs.mkdir(source);
  await fs.writeFile(path.join(source, 'note.md'), '# Gradient\n$\\nabla f$'); await fs.writeFile(path.join(source, 'bad.md'), Buffer.from([0xff, 0xfe]));
  await fs.writeFile(path.join(source, 'scan.pdf'), 'PDF'); await fs.mkdir(path.join(source, 'node_modules')); await fs.writeFile(path.join(source, 'node_modules', 'skip.md'), 'secret');
  const adapter = new KnowledgeSourceAdapter(source, 'test'); const records = [];
  for await (const file of adapter.discover()) records.push(await adapter.read(file, 'revision'));
  assert.equal(records.length, 3); assert.equal(records.find(r => r.path === 'bad.md').disposition, 'failed'); assert.equal(records.find(r => r.path === 'scan.pdf').disposition, 'unsupported');
  const outside = path.join(temp, 'outside.md'); await fs.writeFile(outside, 'private');
  const escaped = await adapter.read({ path: '../outside.md', full: outside, bytes: 7 }, 'r'); assert.equal(escaped.disposition, 'failed');
  const census = { sources: [{ id: 'test', repository: 'test/repo', kind: 'github', access: 'accessible' }] };
  await writeJson(path.join(out, 'census.json'), census); await writeJson(path.join(out, 'test__repo.json'), { records });
  const run = extra => execFileSync(process.execPath, ['scripts/knowledge/batch.mjs', '--corpus', out, ...extra], { cwd: path.resolve(import.meta.dirname, '..'), encoding: 'utf8' });
  run([]); const first = JSON.parse(await fs.readFile(path.join(out, 'batch/report.json'))); assert.equal(first.rendered, 0); assert.equal(first.units, 1); assert.equal(first.dispositions['needs-modeling'], 1);
  run([]); const resumed = JSON.parse(await fs.readFile(path.join(out, 'batch/report.json'))); assert.equal(resumed.cacheHits, 1);
  run(['--retry', '--public']); const restricted = JSON.parse(await fs.readFile(path.join(out, 'batch/report.json'))); assert.equal(restricted.dispositions['rights-restricted'], 1);
  run(['--concept', 'not-present']); const filtered = JSON.parse(await fs.readFile(path.join(out, 'batch/report.json'))); assert.equal(filtered.dispositions['not-yet-processed'], 1); assert.equal(filtered.releaseReady, false);
  // Deliberately keep fixture evidence within OS temp; never delete any user path.
});
for (const [name, fn] of tests) { await fn(); process.stdout.write(`PASS ${name}\n`); }
assert.equal(dispositions.length, 10);
process.stdout.write(`Knowledge: ${tests.length} suites passed\n`);
