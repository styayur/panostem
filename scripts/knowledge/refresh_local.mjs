import { promises as fs } from 'node:fs';
import path from 'node:path';
import { KnowledgeSourceAdapter, gitRead, writeJson } from './local.mjs';
import { githubSources } from '../../src/knowledge/sources.ts';
const root=path.resolve(import.meta.dirname,'../..'),corpus=path.join(root,'.panostem-runtime/vextessera-corpus');
const vaultIndex=process.argv.indexOf('--vault');
if(vaultIndex<0||!process.argv[vaultIndex+1])throw new Error('Provide the read-only source directory with --vault');
const vault=path.resolve(process.argv[vaultIndex+1]);
const census=JSON.parse(await fs.readFile(path.join(corpus,'census.json')));
for(const source of census.sources){
  if(source.kind!=='github'||!source.local)continue;
  if(!githubSources.includes(source.repository))throw new Error('Unregistered local repository');
  const folder=path.join(vault,source.repository.split('/')[1]);
  const origin=await gitRead(folder,['remote','get-url','origin']);
  if(!origin?.toLowerCase().replace(/\.git$/,'').endsWith(source.repository.toLowerCase()))throw new Error('Local origin differs from registered source');
  const revision=await gitRead(folder,['rev-parse','HEAD']);if(!revision)throw new Error('No immutable local revision');
  const adapter=new KnowledgeSourceAdapter(folder,source.id,{origin:source.url});const records=[];
  for await(const record of adapter.discover())records.push(await adapter.read(record,revision));
  source.local.revision=revision;source.local.dirty=!!await gitRead(folder,['status','--porcelain']);
  source.localReindexedAt=new Date().toISOString();source.files=records.length;source.parsedFiles=records.filter(r=>r.units.length).length;
  source.units=records.flatMap(r=>r.units).length;source.dispositions={};
  for(const record of records)source.dispositions[record.disposition]=(source.dispositions[record.disposition]??0)+1;
  await writeJson(path.join(corpus,`${source.repository.replace('/','__')}.json`),{source,records});
  await writeJson(path.join(corpus,'census.json'),census);
  process.stdout.write(`${source.repository}: ${source.files} records, ${source.units} knowledge units\n`);
}
