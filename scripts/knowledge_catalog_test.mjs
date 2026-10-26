import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { importShare } from '../src/studio/share.ts';
import { validateMetadata } from '../src/studio/contracts.ts';
import { conceptById } from '../src/lib/concepts.ts';
const models=JSON.parse(await fs.readFile('src/knowledge/models.json'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(models.length,14);assert.equal(new Set(models.map(m=>m.id)).size,14);
let publicMedia=0;
for(const m of models){
  validateMetadata(m.metadata);assert.ok(m.metadata.concept_ids.every(id=>conceptById.has(id)));
  assert.equal(hash(await fs.readFile(`src-tauri/runtime/examples/knowledge_${m.id}.py`)),m.sourceHash);
  assert.equal(hash(await fs.readFile('src-tauri/runtime/examples/knowledge_helpers.py')),m.helperHash);
  for(const field of ['variables','equations','assumptions','invariants','initialConditions','boundaryConditions','evidence'])assert.ok(Array.isArray(m.model[field]));
  assert.equal(m.model.verification.status,'passed');assert.ok(m.verification.math&&m.verification.render&&m.verification.decode);
  assert.ok(m.sources.length&&m.sources.every(s=>s.contentHash.length===64&&[40,64].includes(s.revision.length)&&s.url.startsWith('https://')));
  for(const s of m.sources)if(s.location.cell!==undefined)assert.ok(!s.url.includes('#L'),'Cell-relative lines must not pretend to be raw Notebook JSON file lines');
  if(m.mediaPath){
    publicMedia++;assert.equal(hash(await fs.readFile(`public/${m.mediaPath}`)),m.mediaHash);
    const bytes=new Uint8Array(await fs.readFile(`public/${m.sharePath}`));assert.equal(hash(bytes),m.shareHash);
    const share=await importShare(bytes);assert.equal(share.manifest.scene.id,m.metadata.id);
    assert.equal(hash(share.files['source/main.py']),m.sourceHash);assert.equal(hash(share.files['source/helpers.py']),m.helperHash);
    assert.equal(hash(share.files['media/scene.mp4']),m.mediaHash);
    assert.ok(new TextDecoder().decode(share.files['NOTICE.txt']).includes('Adam Djellouli'));
  }else assert.equal(m.sharePath,null);
}
assert.equal(publicMedia,6);
process.stdout.write('Knowledge catalog: source/metadata/Concept ID scope, model contracts, actual media/share hashes, source opt-in format and source citations PASS\n');
