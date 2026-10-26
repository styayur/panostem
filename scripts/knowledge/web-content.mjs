import { promises as fs } from 'node:fs';
import path from 'node:path';
import robotsParser from 'robots-parser';
import { parseDocument } from '../../src/knowledge/parse.ts';
import { hash, writeJson } from './local.mjs';
const root = path.resolve(import.meta.dirname, '../..');
if (!process.argv.includes('--allow-network')) throw new Error('Explicit --allow-network required');
const corpus = path.join(root, '.panostem-runtime/vextessera-corpus');
const manifest = JSON.parse(await fs.readFile(path.join(corpus, 'live-index/manifest.json')));
const agent = 'VextesseraResearch/0.6 (+https://github.com/styayur/panostem)';
const running = new AbortController(); process.on('SIGINT', () => running.abort());
async function limitedText(url, host) {
  let current = new URL(url);
  for (let redirects = 0; redirects <= 4; redirects++) {
    if (current.protocol !== 'https:' || ![host, `www.${host}`, host.replace(/^www\./, '')].includes(current.hostname) || current.username || current.password || (current.port && current.port !== '443')) throw new Error('Cross-origin or unsafe redirect refused');
    const response = await fetch(current, { redirect: 'manual', headers: { 'User-Agent': agent }, signal: AbortSignal.any([running.signal, AbortSignal.timeout(20000)]) });
    if (response.status >= 300 && response.status < 400) { const location = response.headers.get('location'); await response.body?.cancel(); if (!location) throw new Error('Redirect without Location'); current = new URL(location, current); continue; }
    const type = response.headers.get('content-type') ?? '';
    if (!response.ok) { await response.body?.cancel(); return { status: response.status, url: current.href, type }; }
    if (!/(?:text\/|application\/(?:json|xml|xhtml\+xml))/.test(type)) { await response.body?.cancel(); return { status: response.status, url: current.href, type, unsupported: true }; }
    const reader = response.body.getReader(); const chunks = []; let size = 0;
    try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2_000_000) throw new Error('Response exceeds 2 MB'); chunks.push(value); } }
    finally { await reader.cancel(); }
    return { status: response.status, url: current.href, type, text: new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)) };
  }
  throw new Error('Redirect limit exceeded');
}
await Promise.all(manifest.map(async provider => {
  const index = JSON.parse(await fs.readFile(path.join(corpus, 'live-index', provider.file)));
  const host = new URL(provider.homepage).hostname, origin = new URL(provider.homepage).origin;
  const records = []; const cacheDir = path.join(corpus, 'web-cache', provider.id); await fs.mkdir(cacheDir, { recursive: true });
  let robots, robotsEvidence, stopReason;
  try {
    const r = await limitedText(`${origin}/robots.txt`, host); robotsEvidence = { status: r.status, hash: hash(r.text ?? ''), checkedAt: new Date().toISOString() };
    if (r.status === 404) robots = robotsParser(`${origin}/robots.txt`, '');
    else if (r.status === 200 && typeof r.text === 'string') robots = robotsParser(`${origin}/robots.txt`, r.text);
    else stopReason = `robots.txt unavailable (${r.status}); fetch deferred`;
  } catch (e) { stopReason = `robots.txt failed: ${e.message}`; }
  const delay = Math.max(500, (robots?.getCrawlDelay('VextesseraResearch') ?? 0) * 1000);
  if (delay > 30000) stopReason = 'robots.txt requests crawl delay above batch budget; deferred for slower schedule';
  for (const entry of index.entries) {
    if (running.signal.aborted) break;
    const id = `${provider.id}:${hash(entry.url)}`, cache = path.join(cacheDir, `${hash(entry.url)}.json`);
    let record;
    try { record = JSON.parse(await fs.readFile(cache)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (record?.disposition === 'failed' && process.argv.includes('--retry-failed')) record = null;
    if (record?.contentHash && process.argv.includes('--reparse')) {
      try {
        const text = await fs.readFile(path.join(cacheDir, `${hash(entry.url)}.html`), 'utf8');
        if (hash(text) !== record.contentHash) throw new Error('Cached page hash mismatch; refetch requires explicit cache repair');
        record.units = parseDocument({ sourceId: provider.id, path: `${hash(entry.url)}.html`, origin: entry.url, revision: record.contentHash, contentHash: record.contentHash, text, rights: 'review-required' });
        if (record.units.length && record.units.every(u => u.text.length < 300 && !u.formulas.length)) {
          record.units = []; record.disposition = 'unsupported'; record.reason = 'Only a short HTML shell or metadata was readable; embedded/JavaScript mathematical model not inspected';
        }
      } catch (e) { record.units = []; record.disposition = 'failed'; record.reason = e.message; }
      await writeJson(cache, record);
    }
    if (!record) {
      record = { id, url: entry.url, title: entry.title, type: entry.result_type, checkedAt: new Date().toISOString(), conceptIds: entry.concept_ids, units: [] };
      try {
        const resource = new URL(entry.url);
        if (![host, `www.${host}`, host.replace(/^www\./, '')].includes(resource.hostname)) { record.disposition = 'rights-restricted'; record.reason = 'External host listed by provider; separate source, access and rights review required before following it'; }
        else if (stopReason) { record.disposition = 'rights-restricted'; record.reason = stopReason; }
        else if (robots.isAllowed(entry.url, 'VextesseraResearch') === false) { record.disposition = 'rights-restricted'; record.reason = 'robots.txt disallows this URL'; }
        else if (entry.result_type === 'video') { record.disposition = 'rights-restricted'; record.reason = 'Video metadata linked only; no download, transcription or derivative rights granted'; }
        else {
          const response = await limitedText(entry.url, host); record.http = { status: response.status, type: response.type, finalUrl: response.url };
          if ([403, 429].includes(response.status)) stopReason = `HTTP ${response.status}; further requests to this provider halted`;
          if (response.status !== 200) { record.disposition = [403, 429].includes(response.status) ? 'rights-restricted' : 'source-unavailable'; record.reason = `HTTP ${response.status}`; }
          else if (response.unsupported) { record.disposition = 'unsupported'; record.reason = `Media type ${response.type} needs separate parser`; }
          else {
            const contentHash = hash(response.text); record.contentHash = contentHash;
            // Cache raw pages privately; no images, scripts, simulations or source code executed.
            await fs.writeFile(path.join(cacheDir, `${hash(entry.url)}.html`), response.text, { mode: 0o600 });
            record.units = parseDocument({ sourceId: provider.id, path: `${hash(entry.url)}.html`, origin: entry.url,
              revision: contentHash, contentHash, text: response.text, rights: 'review-required' });
            if (record.units.length && record.units.every(u => u.text.length < 300 && !u.formulas.length)) record.units = [];
            record.disposition = record.units.length ? 'needs-review' : 'unsupported';
            record.reason = record.units.length ? 'Full HTML read; equations, simulation behavior and file-level rights need review' : 'No static knowledge text; JS/embedded experiment is not executed';
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (e) { record.disposition = 'failed'; record.reason = e.message; }
      await writeJson(cache, record);
    }
    records.push(record);
    if (records.length % 50 === 0) process.stdout.write(`${provider.id}: ${records.length}/${index.entries.length}\n`);
  }
  const source = { id: provider.id, kind: 'provider', url: provider.homepage, access: { accessible: records.some(r => r.http?.status === 200), scope: 'At least one resource HTTP 200; each URL has an independent status record' }, discovered: index.entries.length, files: records.length,
    units: records.flatMap(r => r.units).length, parsedFiles: records.filter(r => r.units.length).length,
    discoveryComplete: false, discoveryScope: 'All resources found by current ProviderRegistry discovery; site-wide hidden/unlinked resources unproven', robots: robotsEvidence,
    samples: records.filter(r => r.units.length).slice(0, 3).map(r => r.units[0].id), snapshotDate: index.updated_at };
  await writeJson(path.join(corpus, `${provider.id}.json`), { source, records });
  await writeJson(path.join(corpus, 'web-summary', `${provider.id}.json`), source);
  process.stdout.write(`${provider.id}: finished ${records.length} records, ${source.units} full-text units\n`);
}));
// Update one shared manifest only after concurrent workers are finished.
const census = JSON.parse(await fs.readFile(path.join(corpus, 'census.json')));
for (const provider of manifest) {
  const s = JSON.parse(await fs.readFile(path.join(corpus, 'web-summary', `${provider.id}.json`)));
  census.sources = census.sources.map(old => old.id === s.id ? s : old);
}
await writeJson(path.join(corpus, 'census.json'), census);
