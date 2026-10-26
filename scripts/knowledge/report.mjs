import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeJson, hash } from './local.mjs';
const root = path.resolve(import.meta.dirname, '../..'), corpus = path.join(root, '.panostem-runtime/vextessera-corpus');
const read = async file => JSON.parse(await fs.readFile(path.join(corpus, file)));
const census = await read('census.json'), batch = await read('batch/report.json'), frozen = await read('frozen-samples.json'), models = await read('sample-results.json');
const reviewedV1 = await read('reviewed-model-samples.json'), reviewedV2 = await read('reviewed-model-samples-v2.json');
if (reviewedV1.some(entry => !reviewedV2.some(candidate => JSON.stringify(candidate) === JSON.stringify(entry)))) throw new Error('Original reviewed samples changed');
const rendered = models.filter(m => m.mathVerified && m.rendered && m.decoded);
const catalog = JSON.parse(await fs.readFile(path.join(root, 'src/knowledge/models.json')));
const publicScenes = rendered.filter(m => m.rightsCleared && catalog.some(item => item.id === m.model && item.mediaPath && item.sharePath));
const output = path.join(root, 'docs/audits/vextessera');
const unitMap = new Map(), recordMap = new Map();
const sources = [];
for (const source of census.sources) {
  let records = [];
  try { records = (await read(source.kind === 'github' ? `${source.repository.replace('/', '__')}.json` : `${source.id}.json`)).records; } catch { /* Unavailable source has no invented records. */ }
  for (const record of records) { if (record.id) recordMap.set(record.id, record); for (const unit of record.units ?? []) unitMap.set(unit.id, unit); }
  const fileDispositions = {};
  for (const record of records) fileDispositions[record.disposition] = (fileDispositions[record.disposition] ?? 0) + 1;
  sources.push({ id: source.id, url: source.url, access: source.access, accessError: source.accessError, localRevision: source.local?.revision,
    localDirty: source.local?.dirty, remote: source.remote, files: source.files, parsedFiles: source.parsedFiles, units: source.units,
    formats: source.formats ?? { html: records.length }, fileDispositions, rights: source.rights ?? 'review-required',
    discoveryComplete: source.kind === 'github' ? !!source.local : false, discoveryScope: source.discoveryScope ?? (source.local ? 'All files in verified local clone at recorded revision' : source.localError),
    independentSourceModels: models.filter(m => m.decoded && m.sources.some(u => u.id.startsWith(source.id + ':'))).map(m => m.model),
    limitations: source.kind === 'provider' ? ['All ProviderRegistry-discovered URLs are recorded; unlinked/site-wide completeness is not proven', 'Static HTML is not execution or verification of the original interactive solver'] : ['Repository license does not establish rights to third-party textbooks/images; public bodies are excluded'] });
}
const sourceSamples = frozen.sources.map(source => ({ id: source.id, frozenIds: source.samples,
  samples: source.samples.map(id => {
    const unit = unitMap.get(id), record = recordMap.get(id); const candidate = unit ?? record?.units?.[0];
    const verified = models.filter(m => m.decoded && m.sources.some(u => u.id === candidate?.id));
    return { id, parsedUnitId: candidate?.id, format: candidate?.format, formulaCount: candidate?.formulas.length ?? 0,
      parseStatus: candidate?.parseStatus ?? record?.disposition ?? 'source-unavailable', verifiedModels: verified.map(m => m.model),
      disposition: verified.length ? 'verified-local-scene' : record?.disposition === 'rights-restricted' ? 'rights-restricted' : 'needs-review',
      reason: verified.length ? 'Exact source hash and listed equation checked; scene rendered and decoded' : candidate ? (candidate.errors.join('; ') || 'No reviewed mathematical recipe covers this frozen knowledge unit') : record?.reason ?? 'Frozen resource not available in current corrected discovery; retained for comparison' };
  }) }));
const summary = { schemaVersion: 1, generatedAt: new Date().toISOString(), baselineCommit: census.sourceCommit, conceptCount: census.conceptCount,
  sourceCount: sources.length, availableGitClones: sources.filter(s => s.localRevision).length, unavailableRepositories: sources.filter(s => s.access === 'source-unavailable').length,
  websiteResources: sources.filter(s => !s.id.startsWith('github:')).reduce((sum, s) => sum + s.files, 0),
  files: batch.files, parsedFiles: batch.parsedFiles, units: batch.units, dispositions: batch.dispositions, fileDispositions: batch.fileDispositions,
  coverage: {
    registeredSourcesAudited: { numerator: sources.length, denominator: 22 },
    fileParsing: { numerator: batch.parsedFiles, denominator: batch.files },
    canonicalConceptResolution: { numerator: batch.conceptResolvedUnits, denominator: batch.units },
    formulaBearingUnits: { numerator: batch.formulaUnits, denominator: batch.units, note: 'Formula-bearing is not a suitability or correctness decision' },
    suitableForVisualization: { numerator: null, denominator: null, reason: 'Whole-corpus mathematical suitability review is incomplete' },
    verifiedSceneAssociation: { numerator: batch.verifiedSceneLinks, denominator: batch.units },
    latestReviewedRenderPass: { numerator: models.filter(m => m.mathVerified && m.rendered && m.decoded).length, denominator: models.length },
    mediaRedistribution: { numerator: publicScenes.length, denominator: rendered.length },
  },
  renderedScenes: models.filter(m => m.rendered && m.decoded && m.mathVerified).length, verifiedSceneLinks: batch.verifiedSceneLinks,
  publiclyDistributableScenes: publicScenes.length, notYetProcessedUnits: batch.dispositions['not-yet-processed'],
  unprocessedSources: batch.unprocessedSources, errors: batch.errors, discoveryComplete: batch.discoveryComplete, releaseReady: batch.releaseReady,
  frozenCorpusHash: frozen.corpusHash, reviewedSampleHash: hash(JSON.stringify(reviewedV1)),
  activeReviewedSamples: 'reviewed-model-samples-v2.json', activeReviewedSampleHash: hash(JSON.stringify(reviewedV2)),
  releaseReadyMeaning: 'Complete corpus discovery and mathematical visualization, not the release approval of a scoped architecture alpha',
  averageGenerationSeconds: models.reduce((n, m) => n + (m.generationSeconds ?? 0), 0) / models.length,
  averageRenderSeconds: models.reduce((n, m) => n + (m.renderSeconds ?? 0), 0) / models.length,
  sampleMediaBytes: models.reduce((n, m) => n + (m.bytes ?? 0), 0), batchPeakResidentSetKb: batch.maxResidentSetKb,
  rendererPeakResourceUsage: null, sourceModelCorrespondence: 'Exact reviewed formula and content-hash checks; no independent whole-corpus accuracy percentage claimed',
  sources };
await writeJson(path.join(output, 'source-census.json'), summary);
await writeJson(path.join(output, 'frozen-samples.json'), { ...frozen, evaluations: sourceSamples });
await writeJson(path.join(output, 'rendered-samples.json'), models.map(({ movie, python, ...m }) => ({ ...m, localArtifacts: `ignored runtime corpus/samples/${m.model}`, distribution: publicScenes.some(scene => scene.model === m.model) ? 'Reviewed self-rendered media and ordinary source share in public/knowledge' : 'Local generation only; source rights review required' })));
await writeJson(path.join(output, 'reviewed-model-samples.json'), reviewedV1);
await writeJson(path.join(output, 'reviewed-model-samples-v2.json'), reviewedV2);
await writeJson(path.join(output, 'reference-review.json'), { repositories: census.references, modules: (await read('references/module-review.json')).map(({ interfaceLines, ...module }) => module) });
process.stdout.write(JSON.stringify({ sources: sources.length, units: summary.units, rendered: summary.renderedScenes, releaseReady: summary.releaseReady }) + '\n');
