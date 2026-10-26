import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exportShare } from '../../src/studio/share.ts';
import { validateMetadata } from '../../src/studio/contracts.ts';
import { hash, writeJson } from './local.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const root = path.resolve(import.meta.dirname, '../..'), corpus = path.join(root, '.panostem-runtime/vextessera-corpus');
const results = JSON.parse(await fs.readFile(path.join(corpus, 'sample-results.json')));
const permitted = new Set(['newton','bisection','oscillator','gradient','wave','heat']);
const titles = {
  newton:['Newton iteration','牛顿迭代','牛頓迭代'], bisection:['Bisection and its error bound','二分法与误差界','二分法與誤差界'],
  oscillator:['Harmonic oscillator','简谐振子','簡諧振子'], gradient:['Gradient descent in three dimensions','三维梯度下降','三維梯度下降'],
  square:['Complex squaring','复数平方映射','複數平方映射'], polar:['Polar form of a complex number','复数的极形式','複數的極形式'],
  linear:['Linear map, determinant and inverse','线性变换、行列式与逆','線性變換、行列式與逆'], union:['Inclusion-exclusion','概率容斥关系','機率容斥關係'],
  means:['Inequalities between means','均值不等式','均值不等式'], wave:['Standing wave','驻波','駐波'], heat:['Thermal diffusion','热扩散','熱擴散'],
  beam:['Cantilever and finite elements','悬臂梁与有限元','懸臂梁與有限元素'],electric:['Point charge field and potential','点电荷电场与电势','點電荷電場與電勢'],control:['Filtered PID response (authored model)','滤波 PID 响应（自行定义模型）','濾波 PID 響應（自行定義模型）'],
};
const reference = JSON.parse(await fs.readFile(path.join(corpus, 'references/djeada__Numerical-Methods.json')));
const sourceLicense = Buffer.from(reference.license.data.content, 'base64').toString('utf8');
if (!sourceLicense.includes('MIT License') || !sourceLicense.includes('Adam Djellouli')) throw new Error('Expected independently checked MIT source grant is missing');
const runtime = path.join(root, 'src-tauri/runtime/examples');
const catalog = [], runtimeCatalog = {};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
for (const r of results) {
  if (!r.mathVerified || !r.rendered || !r.decoded || r.status !== 'verified-local-scene') throw new Error(`No verified render for ${r.model}`);
  if(!Object.hasOwn(titles,r.model))throw new Error('Unrecognized reviewed recipe');
  const relativeMovie=path.relative(corpus,path.resolve(r.movie));
  if(relativeMovie.startsWith('..')||path.isAbsolute(relativeMovie))throw new Error('Media leaves private corpus');
  const run=JSON.parse(await fs.readFile(path.join(path.dirname(r.movie),'run.json')));
  if(run.revision!==r.projectRevision||run.revision_scheme!==2)throw new Error('Render source revision differs from sample evidence');
  const files=run.source_manifest.map(f=>({path:f.path,size:f.size,sha256:f.sha256})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const revisionFiles=files.map(({path,sha256})=>({path,sha256}));
  if(hash(JSON.stringify(canonical({scheme:2,files:revisionFiles})))!==run.revision)throw new Error('Captured source manifest hash mismatch');
  const captured=path.join(path.dirname(r.movie),'.execution');
  const expectedFiles=new Set(['main.py','helpers.py','panostem.json','scene.json','model.json','intent.json']);
  for(const f of files){
    if(!expectedFiles.has(f.path))throw new Error('Unexpected file in reviewed example capture');
    const bytes=await fs.readFile(path.join(captured,f.path));
    if(bytes.length!==f.size||hash(bytes)!==f.sha256)throw new Error('Captured source bytes changed after rendering');
  }
  const metadata = validateMetadata(JSON.parse(await fs.readFile(path.join(captured, 'panostem.json'))));
  const model = JSON.parse(await fs.readFile(path.join(captured, 'model.json'))), intent = JSON.parse(await fs.readFile(path.join(captured, 'intent.json')));
  const source = await fs.readFile(path.join(captured, 'main.py')), helper = await fs.readFile(path.join(captured, 'helpers.py'));
  if (!source.toString().replaceAll('\r\n','\n').startsWith('from manimlib import *\n')) throw new Error('Unexpected recipe source producer');
  const sources = r.sources.map(s => {
    const repo = s.origin.replace(/\/$/, '');
    const location = s.location;
    return { unitId: s.id, revision: s.revision, contentHash: s.contentHash, location,
      url: repo.startsWith('https://github.com/')?`${repo}/blob/${s.revision}/${location.path.split('/').map(encodeURIComponent).join('/')}${location.page?`#page=${location.page}`:location.cell===undefined?`#L${location.startLine}`:''}`:repo };
  });
  const [en,cn,tw] = titles[r.model];
  const item = { id:r.model, title:{en,'zh-CN':cn,'zh-TW':tw}, metadata, model, intent, sources,
    sourceHash:hash(source), helperHash:hash(helper), verification:{math:true,render:true,decode:true,verificationHash:r.verificationHash},
    redistribution:permitted.has(r.model) ? 'cleared-original-example-with-MIT-source-attribution' : 'local-generation-only-source-rights-review', sharePath:null, mediaPath:null };
  await fs.writeFile(path.join(runtime, `knowledge_${r.model}.py`), source);
  runtimeCatalog[`knowledge-${r.model}`] = { file:`knowledge_${r.model}.py`, metadata, model, intent };
  if (permitted.has(r.model)) {
    if (!r.sources.every(s => s.origin === 'https://github.com/djeada/Numerical-Methods')) throw new Error('Redistribution review scope differs from the MIT source');
    const bytes = await fs.readFile(r.movie);
    const reviewMovie=path.join(corpus,'packaging-check',`${hash(bytes)}.mp4`);await fs.mkdir(path.dirname(reviewMovie),{recursive:true});await fs.writeFile(reviewMovie,bytes);
    const decoder=path.join(root,'.panostem-runtime/bin',process.platform==='win32'?'ffmpeg.exe':'ffmpeg');
    await promisify(execFile)(decoder,['-v','error','-i',reviewMovie,'-f','null','-'],{timeout:60000,maxBuffer:1000000});
    const notice = `Original application-owned scene, helper and rendered expression: AGPL-3.0-only. No external images, video, animation code or textbook body is included.\nMathematical source attribution: ${sources.map(s=>s.url).join('\n')}\nSource notes copyright (c) 2021 Adam Djellouli, MIT:\n${sourceLicense}\nApplication source: https://github.com/styayur/panostem\n`;
    const archive = await exportShare(metadata,[{path:'media/scene.mp4',role:'video',data:new Uint8Array(bytes)},
      {path:'source/main.py',role:'source',data:new Uint8Array(source)},{path:'source/helpers.py',role:'source',data:new Uint8Array(helper)},
      {path:'model.txt',role:'notice',data:new TextEncoder().encode(JSON.stringify(model,null,2))},{path:'NOTICE.txt',role:'notice',data:new TextEncoder().encode(notice)}]);
    const mediaDir = path.join(root,'public/knowledge'); await fs.mkdir(mediaDir,{recursive:true});
    item.sharePath=`knowledge/${r.model}.panostem.zip`;item.mediaPath=`knowledge/${r.model}.mp4`;
    item.mediaHash=hash(bytes);item.shareHash=hash(archive);
    await fs.writeFile(path.join(root,'public',item.sharePath),archive);await fs.writeFile(path.join(root,'public',item.mediaPath),bytes);
  }
  catalog.push(item);
}
await fs.writeFile(path.join(runtime,'knowledge_helpers.py'),await fs.readFile(path.join(corpus,'samples/newton/helpers.py')));
await writeJson(path.join(runtime,'knowledge_catalog.json'),runtimeCatalog);
await writeJson(path.join(root,'src/knowledge/models.json'),catalog);
const bindings=JSON.parse(await fs.readFile(path.join(corpus,'verified-scenes.json')));
for(const binding of bindings){
  const item=catalog.find(m=>`knowledge-${m.id}`===binding.id);
  binding.rightsCleared=!!item?.mediaPath;binding.media=item?.mediaPath??undefined;
}
for(const result of results){
  const item=catalog.find(m=>m.id===result.model);result.rightsCleared=!!item?.mediaPath;
  result.redistributionReview=item?.redistribution;
}
await writeJson(path.join(corpus,'verified-scenes.json'),bindings);
await writeJson(path.join(corpus,'sample-results.json'),results);
process.stdout.write(`${catalog.length} source-grounded model templates; ${catalog.filter(m=>m.mediaPath).length} cleared actual media/share packages\n`);
