import { promises as fs } from 'node:fs';
import path from 'node:path';
import { hash, writeJson } from './local.mjs';
import { dispositions, VisualKnowledgeRegistry } from '../../src/knowledge/types.ts';
import { conceptById } from '../../src/lib/concepts.ts';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const value = (key, fallback) => { const i = args.indexOf(key); if (i < 0) return fallback; if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing ${key}`); return args[i + 1]; };
const corpus = path.resolve(value('--corpus', path.join(root, '.panostem-runtime/vextessera-corpus')));
const output = path.resolve(value('--out', path.join(corpus, 'batch')));
if (output === corpus || !path.relative(corpus, output) || path.relative(output, corpus).startsWith('..') === false) throw new Error('Batch output must not overwrite input corpus');
const concurrency = Number(value('--concurrency', '2')), timeout = Number(value('--timeout', '600000'));
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8 || !Number.isFinite(timeout) || timeout < 1) throw new Error('Invalid concurrency or timeout');
const sourceFilter = value('--source', '').split(',').filter(Boolean), conceptFilter = value('--concept', '').split(',').filter(Boolean);
const typeFilter = value('--type', '').split(',').filter(Boolean), statusFilter = value('--status', '').split(',').filter(Boolean);
const subjectFilter = value('--subject', '').split(',').filter(Boolean);
if (statusFilter.some(s => !dispositions.includes(s))) throw new Error('Invalid disposition filter');
const census = JSON.parse(await fs.readFile(path.join(corpus, 'census.json')));
const started = Date.now(); let cancelled = false;
const abort = new AbortController();
process.on('SIGINT', () => { cancelled = true; abort.abort(); });
if (args.includes('--render-reviewed')) {
  if (!args.includes('--allow-execution')) throw new Error('Rendering reviewed application recipes requires --allow-execution');
  const python = value('--python', path.join(root, '.panostem-runtime/venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'));
  // Fixed application code only. Imported document code never enters this argument list.
  await promisify(execFile)(python, [path.join(root, 'scripts/knowledge/sampling.py'), '--allow-execution', '--corpus', corpus], { cwd: root, timeout, signal: abort.signal, maxBuffer: 16_000_000 });
}
const registry = new VisualKnowledgeRegistry();
let bindings = [];
try { bindings = JSON.parse(await fs.readFile(path.join(corpus, 'verified-scenes.json'))); } catch (e) { if (e.code !== 'ENOENT') throw e; }
for (const binding of bindings) registry.register(binding);
const bindingHashes = {};
for (const source of census.sources) {
  if (!bindings.some(b => b.unitIds.some(id => id.startsWith(source.id + ':')))) continue;
  const file = source.kind === 'github' ? `${source.repository.replace('/', '__')}.json` : `${source.id}.json`;
  try {
    const data = JSON.parse(await fs.readFile(path.join(corpus, file)));
    for (const record of data.records) for (const u of record.units ?? []) bindingHashes[u.id] = u.contentHash;
  } catch { /* Missing current evidence leaves the scene stale, never a successful reuse. */ }
}
const report = { schemaVersion: 1, pipelineVersion: 'knowledge-1', startedAt: new Date().toISOString(), censusHash: hash(JSON.stringify(census)),
  scope: { sourceFilter, conceptFilter, typeFilter, statusFilter, subjectFilter, publicDistribution: args.includes('--public') }, discoveryComplete: census.sources.every(s => s.kind !== 'provider' || s.discoveryComplete === true),
  sourceCount: census.sources.length, sources: [], units: 0, files: 0, dispositions: Object.fromEntries(dispositions.map(s => [s, 0])),
  parsedFiles: 0, conceptResolvedUnits: 0, formulaUnits: 0, verifiedSceneLinks: 0, rendered: 0, publiclyDistributable: 0, cacheHits: 0, errors: [] };
const queue = census.sources.filter(s => !sourceFilter.length || sourceFilter.includes(s.id));
async function work(source) {
  const file = source.kind === 'github' ? `${source.repository.replace('/', '__')}.json` : `${source.id}.json`;
  let sourceData;
  try { sourceData = JSON.parse(await fs.readFile(path.join(corpus, file))); }
  catch (e) {
    const result = { id: source.id, units: 0, files: 0, disposition: source.access === 'source-unavailable' ? 'source-unavailable' : 'failed', reason: source.accessError ?? source.localError ?? e.message };
    report.sources.push(result); if (result.disposition === 'failed') report.errors.push(result); return;
  }
  const sourceKey = hash(JSON.stringify([sourceData, report.pipelineVersion, bindings, bindingHashes, report.scope]));
  const checkpointPath = path.join(output, `${hash(source.id)}.json`);
  let checkpoint;
  try { checkpoint = JSON.parse(await fs.readFile(checkpointPath)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (checkpoint?.key === sourceKey && checkpoint.complete && !args.includes('--retry')) { report.cacheHits++; report.sources.push(checkpoint.result); return; }
  const records = [];
  for (const record of sourceData.records) {
    if (cancelled || Date.now() - started > timeout) { cancelled = true; break; }
    const units = record.units ?? [];
    const decisions = [];
    for (const u of units) {
      const selected = (!conceptFilter.length || conceptFilter.some(c => u.conceptIds.includes(c))) && (!typeFilter.length || typeFilter.includes(u.format)) && (!statusFilter.length || statusFilter.includes(u.disposition)) && (!subjectFilter.length || u.conceptIds.some(id => subjectFilter.includes(conceptById.get(id)?.subject)));
      let disposition = 'not-yet-processed', reason = 'Outside requested processing scope'; let scenes = [];
      if (selected) {
        if (u.parseStatus === 'failed') { disposition = 'failed'; reason = u.errors.join('; '); }
        else {
          scenes = [...registry.scenes.values()].filter(s => s.unitIds.includes(u.id) && !registry.stale(s.id, bindingHashes));
          if (scenes.length) { disposition = scenes.some(s => s.unitIds.length > 1) ? 'reused' : 'visualized'; reason = 'Exact source revision has independently verified and decoded scene'; }
          else if (args.includes('--public') && u.rights !== 'cleared') { disposition = 'rights-restricted'; reason = 'File-level derivative/media redistribution rights have not been cleared'; }
          else if (u.errors.length) { disposition = 'needs-review'; reason = u.errors.join('; '); }
          else if (u.formulas.length) { disposition = 'needs-modeling'; reason = `${u.formulas.length} explicit formulas extracted; domains, assumptions, units and independent verification need a reviewed model`; }
          else { disposition = 'needs-review'; reason = 'No explicit mathematical formula extracted; source must be read before assigning a model'; }
        }
      }
      decisions.push({ id: u.id, contentHash: u.contentHash, location: u.location, format: u.format, conceptIds: u.conceptIds, formulaCount: u.formulas.length,
        disposition, reason, sceneIds: scenes.map(s => s.id), publiclyDistributable: scenes.some(s => s.rightsCleared && s.media) });
    }
    records.push({ path: record.path, url: record.url, contentHash: record.contentHash ?? record.snapshotHash, disposition: units.length ? undefined : record.disposition,
      reason: units.length ? undefined : record.reason, units: decisions });
  }
  const result = { id: source.id, files: sourceData.records.length, processedFiles: records.length, records, unprocessedFiles: sourceData.records.length - records.length,
    scope: source.kind === 'provider' ? 'Provider snapshot; individual content/discovery evidence is separate' : 'All discovered regular files in verified local clone' };
  await writeJson(checkpointPath, { key: sourceKey, complete: !cancelled, result }); report.sources.push(result);
}
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (queue.length && !cancelled) {
    const source = queue.shift(); try { await work(source); } catch (e) { report.errors.push({ source: source.id, error: e.message }); }
  }
}));
for (const source of report.sources) {
  report.files += source.files;
  for (const record of source.records ?? []) {
    if (record.units.length) report.parsedFiles++;
    for (const u of record.units) {
      report.units++; report.dispositions[u.disposition]++;
      if (u.conceptIds.length) report.conceptResolvedUnits++;
      if (u.formulaCount) report.formulaUnits++;
      if (u.sceneIds.length) report.verifiedSceneLinks++;
      if (u.publiclyDistributable) report.publiclyDistributable++;
    }
  }
}
report.rendered = registry.scenes.size;
report.fileDispositions = Object.fromEntries(dispositions.map(s => [s, 0]));
for (const source of report.sources) for (const record of source.records ?? []) if (record.disposition) report.fileDispositions[record.disposition]++;
report.maxResidentSetKb = process.resourceUsage().maxRSS;
report.cancelled = cancelled; report.unprocessedSources = queue.map(s => s.id); report.elapsedMs = Date.now() - started;
report.processingCompleteWithinDiscovery = !cancelled && !report.errors.length && !report.dispositions['not-yet-processed'];
report.releaseReady = report.discoveryComplete && report.processingCompleteWithinDiscovery && report.dispositions['needs-modeling'] === 0 && report.dispositions['needs-review'] === 0;
await writeJson(path.join(output, 'report.json'), report);
const summary = { ...report, sources: report.sources.map(({ records, ...s }) => ({ ...s, decisions: records?.flatMap(r => r.units).length ?? 0 })) };
await writeJson(path.join(output, 'summary.json'), summary);
await fs.writeFile(path.join(output, 'report.md'), `# Knowledge corpus disposition\n\nGenerated ${report.startedAt}. No rendering success is inferred from parsing or syntax.\n\nDiscovery complete: ${report.discoveryComplete}. Release ready: ${report.releaseReady}.\n\n| Measure | Count |\n| --- | ---: |\n| Sources in census | ${report.sourceCount} |\n| Files | ${report.files} |\n| Parsed files | ${report.parsedFiles} |\n| Knowledge units | ${report.units} |\n${Object.entries(report.dispositions).map(([s, n]) => `| ${s} | ${n} |`).join('\n')}\n| Actual verified/rendered/decoded scenes | ${report.rendered} |\n\nSnapshot metadata is not a parsed knowledge unit. Source/file/scene counts are separate. See report.json for per-file decisions and errors.\n`);
process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
if (cancelled || report.errors.length) process.exitCode = 1;
