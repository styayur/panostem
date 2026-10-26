import { promises as fs } from 'node:fs';
import path from 'node:path';
import { hash,writeJson } from './local.mjs';
const root=path.resolve(import.meta.dirname,'../..'),corpus=path.join(root,'.panostem-runtime/vextessera-corpus');
const census=JSON.parse(await fs.readFile(path.join(corpus,'census.json')));
const file='pizofreude__TheFEAMan.json',data=JSON.parse(await fs.readFile(path.join(corpus,file)));
const source=data.source,sourcePath='docs/TM_Formelsammlung/TM2_Biegelinien.pdf';
const expected='f2eec083f67b3984fc9a0511c861d6365e5192bffaa7d990e00e2b8bc612d299';
const vaultIndex=process.argv.indexOf('--vault');if(vaultIndex<0)throw new Error('Provide --vault for manual source hash verification');
const sourceFile=path.join(path.resolve(process.argv[vaultIndex+1]),'TheFEAMan',sourcePath);
const bytes=await fs.readFile(sourceFile);if(bytes.length>2_000_000||hash(bytes)!==expected)throw new Error('Manually reviewed PDF changed; a new visual review is required');
const record=data.records.find(r=>r.path===sourcePath);if(!record)throw new Error('Manual review source is outside discovered corpus');
const location={path:sourcePath,startLine:1,endLine:1,heading:['Beam deflection table','Uniformly loaded cantilever'],page:1,region:'row 3'};
const expression='w(x)=q*x^2*(6*L^2-4*L*x+x^2)/(24*E*I)';
record.contentHash=expected;record.disposition='needs-review';record.reason='One formula and boundary diagram visually reviewed at PDF page 1, row 3; general extraction and redistribution rights remain unverified';
record.units=[{schemaVersion:1,id:`${source.id}:${encodeURIComponent(sourcePath+'#page-1-row-3')}`,sourceId:source.id,origin:source.url,revision:source.local.revision,contentHash:expected,
 location,format:'pdf-manual-review',language:'de',title:'Uniformly loaded cantilever: reviewed formula',text:'Application-authored review note: the table gives the elastic deflection of a uniformly loaded clamped beam. No source image or textbook body is reproduced.',
 formulas:[{expression,location,evidence:'document-explicit',representation:'tex'}],references:[],conceptIds:['differential-equation','linear-system'],conceptEvidence:{'differential-equation':['reviewed beam equation'],'linear-system':['independently derived finite-element system']},
 assumptions:['Linear elastic Euler-Bernoulli beam; constant E and I; small deflection; clamp at x=0 and free end x=L'],rights:'review-required',parseStatus:'partial',errors:['Manual page/region review only; PDF text extraction was scrambled; no blanket PDF or media rights clearance'],disposition:'needs-review',reason:record.reason,modelIds:[],sceneIds:[]}];
source.parsedFiles=data.records.filter(r=>r.units.length).length;source.units=data.records.flatMap(r=>r.units).length;source.manualReview={contentHash:expected,page:1,region:'row 3',method:'Rendered page inspected; formula independently differentiated and compared with finite elements'};
census.sources=census.sources.map(s=>s.id===source.id?source:s);
await writeJson(path.join(corpus,file),data);await writeJson(path.join(corpus,'census.json'),census);
process.stdout.write('Manual PDF review registered for its exact bytes, page and table row; source PDF unchanged\n');
