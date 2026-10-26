import { promises as fs } from 'node:fs';
import path from 'node:path';
import { KnowledgeSourceAdapter, gitRead, writeJson } from './local.mjs';
const args = process.argv.slice(2);
const get = key => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
if (!get('--root') || !get('--source') || !get('--out')) throw new Error('Usage: knowledge:ingest -- --root DIRECTORY --source ID --out PRIVATE_INDEX.json [--ignore NAME,NAME] [--type .md,.tex]');
const root = path.resolve(get('--root')), out = path.resolve(get('--out'));
const contained = path.relative(await fs.realpath(root), out);
if (!contained || (contained !== '..' && !contained.startsWith('..' + path.sep) && !path.isAbsolute(contained))) throw new Error('Index output must be outside the read-only source directory');
if (!/^[a-zA-Z0-9][a-zA-Z0-9:/_.-]{0,160}$/.test(get('--source'))) throw new Error('Invalid source ID');
const sourceId = get('--source');
const adapter = new KnowledgeSourceAdapter(root, sourceId, { ignore: get('--ignore')?.split(','), types: get('--type')?.split(',') });
const revision = await gitRead(root, ['rev-parse', 'HEAD']);
let previous;
try { previous = JSON.parse(await fs.readFile(out)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
if (previous && previous.source.id !== sourceId) throw new Error('Existing index belongs to a different source');
const records = [];
let cancelled = false; process.on('SIGINT', () => { cancelled = true; });
for await (const record of adapter.discover()) {
  if (cancelled) break;
  records.push(await adapter.read(record, revision));
}
if (cancelled) { process.exitCode = 1; process.stdout.write('Cancelled; previous index retained\n'); }
else {
  // One recoverable prior generation; never write into or remove anything from the source.
  if (previous) await writeJson(out + '.previous.json', previous);
  await writeJson(out, { schemaVersion: 1, private: true, indexedAt: new Date().toISOString(), source: { id: sourceId, revision, files: records.length }, records });
  process.stdout.write(`${records.length} files, ${records.flatMap(r => r.units).length} knowledge units; private index saved\n`);
}
