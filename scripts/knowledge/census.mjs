import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { githubSources, referenceProjects } from '../../src/knowledge/sources.ts';
import { KnowledgeSourceAdapter, gitRead, writeJson, hash } from './local.mjs';
const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, '../..');
const arg = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const vault = arg('--vault') ?? 'D:/Docs/Obsidian Vault';
const out = path.resolve(arg('--out') ?? path.join(root, '.panostem-runtime/vextessera-corpus'));
const outputRelativeToVault = path.relative(path.resolve(vault), out);
if (!outputRelativeToVault || (!outputRelativeToVault.startsWith('..' + path.sep) && outputRelativeToVault !== '..' && !path.isAbsolute(outputRelativeToVault))) throw new Error('Census output must stay outside the read-only Vault');
if (!process.argv.includes('--allow-network')) throw new Error('Source census requires explicit --allow-network; local importer is offline by default');
await fs.mkdir(out, { recursive: true });
const report = { schemaVersion: 1, checkedAt: new Date().toISOString(), sourceCommit: await gitRead(root, ['rev-parse', 'HEAD']),
  conceptCount: JSON.parse(await fs.readFile(path.join(root, 'src/lib/concepts.json'))).length,
  discoveryScope: 'All registered sources; web snapshot plus live discovery tracked separately. No global completeness claim.', sources: [], references: [] };
async function api(endpoint) {
  try { const r = await exec('gh', ['api', endpoint], { timeout: 30000, maxBuffer: 8 * 1024 * 1024 }); return { status: 'accessible', data: JSON.parse(r.stdout) }; }
  catch (e) { return { status: /404|Not Found/.test(e.stderr ?? '') ? 'source-unavailable' : 'failed', error: (e.stderr ?? e.message).slice(0, 1200) }; }
}
for (const repo of githubSources) {
  const id = `github:${repo.toLowerCase()}`, dir = path.join(vault, repo.split('/')[1]);
  const remote = await api(`repos/${repo}`);
  const source = { id, kind: 'github', repository: repo, url: `https://github.com/${repo}`, access: remote.status,
    remote: remote.data ? { canonicalName: remote.data.full_name, defaultBranch: remote.data.default_branch, pushedAt: remote.data.pushed_at, license: remote.data.license?.spdx_id ?? 'NOASSERTION', archived: remote.data.archived } : null,
    accessError: remote.error, local: null, rights: 'review-required', files: 0, parsedFiles: 0, units: 0, formats: {}, dispositions: {}, samples: [] };
  const origin = await gitRead(dir, ['remote', 'get-url', 'origin']);
  const revision = await gitRead(dir, ['rev-parse', 'HEAD']);
  if (origin && origin.toLowerCase().replace(/\.git$/, '').endsWith(repo.toLowerCase()) && revision) {
    source.local = { revision, dirty: !!(await gitRead(dir, ['status', '--porcelain'])), origin };
    const adapter = new KnowledgeSourceAdapter(dir, id, { origin: source.url });
    const records = [];
    for await (const file of adapter.discover()) {
      const parsed = await adapter.read(file, revision); records.push(parsed);
      source.files++; source.units += parsed.units.length; if (parsed.units.length) source.parsedFiles++;
      const format = path.extname(file.path).toLowerCase() || '(none)'; source.formats[format] = (source.formats[format] ?? 0) + 1;
      source.dispositions[parsed.disposition] = (source.dispositions[parsed.disposition] ?? 0) + 1;
    }
    // Frozen stratification: mathematical material, structural complexity, then remaining format strata.
    const units = records.flatMap(r => r.units);
    const select = u => { if (u && !source.samples.includes(u.id)) source.samples.push(u.id); };
    select(units.find(u => u.formulas.length > 2)); select(units.find(u => u.references.length > 3));
    for (const format of new Set(units.map(u => u.format))) select(units.find(u => u.format === format));
    for (const u of units) { if (source.samples.length >= 3) break; select(u); }
    await writeJson(path.join(out, `${repo.replace('/', '__')}.json`), { source, records });
  } else source.localError = origin ? 'Local origin does not match registered repository; not ingested' : 'No verified local Git clone';
  report.sources.push(source);
  process.stdout.write(`${repo}: ${source.access}, ${source.files} files, ${source.units} parsed units\n`);
  await writeJson(path.join(out, 'census.json'), report);
}
const manifest = JSON.parse(await fs.readFile(path.join(root, 'public/index/manifest.json')));
for (const provider of manifest) {
  const snapshot = JSON.parse(await fs.readFile(path.join(root, 'public/index', provider.file)));
  let access;
  try { const response = await fetch(provider.homepage, { signal: AbortSignal.timeout(20000) }); access = { status: response.status, url: response.url, accessible: response.ok }; await response.body?.cancel(); }
  catch (e) { access = { error: String(e.message), accessible: false }; }
  const records = snapshot.entries.map(e => ({ id: `${provider.id}:${hash(e.url)}`, url: e.url, title: e.title, type: e.result_type,
    conceptIds: e.concept_ids ?? [], snapshotHash: hash(JSON.stringify(e)), disposition: 'needs-review',
    reason: 'Navigation metadata only; full resource model and rights have not been read or verified' }));
  const source = { id: provider.id, kind: 'provider', url: provider.homepage, access, files: records.length, parsedFiles: 0, units: 0,
    snapshotDate: provider.updated_at, discoveryComplete: false, rights: 'review-required', samples: records.slice(0, 3).map(r => r.id),
    dispositions: { 'needs-review': records.length } };
  await writeJson(path.join(out, `${provider.id}.json`), { source, records }); report.sources.push(source);
  process.stdout.write(`${provider.id}: HTTP ${access.status ?? 'error'}, ${records.length} snapshot records (not full-text models)\n`);
}
for (const repo of referenceProjects) {
  const meta = await api(`repos/${repo}`);
  let tree = null, readme = null, license = null;
  if (meta.data) {
    const branch = meta.data.default_branch;
    const commit = await api(`repos/${repo}/commits/${branch}`);
    const revision = commit.data?.sha;
    if (revision) {
      tree = await api(`repos/${repo}/git/trees/${revision}?recursive=1`);
      readme = await api(`repos/${repo}/readme?ref=${revision}`);
      license = await api(`repos/${repo}/license?ref=${revision}`);
      await writeJson(path.join(out, 'references', `${repo.replace('/', '__')}.json`), { revision, tree, readme, license });
    }
    report.references.push({ repository: repo, access: meta.status, revision, license: meta.data.license?.spdx_id ?? 'NOASSERTION',
      treeTruncated: tree?.data?.truncated, paths: tree?.data?.tree?.filter(f => /(?:parser|schema|ast|graph|search|slide|render|model|license|copyright)/i.test(f.path)).slice(0, 50).map(f => f.path),
      readmeRead: !!readme?.data?.content, licenseRead: !!license?.data?.content });
  } else report.references.push({ repository: repo, access: meta.status, error: meta.error });
  process.stdout.write(`Reference audit: ${repo}: ${meta.status}\n`);
}
await writeJson(path.join(out, 'census.json'), report);
const frozen = { schemaVersion: 1, createdAt: report.checkedAt, sources: report.sources.map(s => ({ id: s.id, samples: s.samples })), corpusHash: hash(JSON.stringify(report.sources)) };
try { await fs.writeFile(path.join(out, 'frozen-samples.json'), JSON.stringify(frozen, null, 2), { flag: 'wx', mode: 0o600 }); }
catch (e) { if (e.code !== 'EEXIST') throw e; }
process.stdout.write(`Census saved privately to ${out}; ${report.sources.length} sources.\n`);
