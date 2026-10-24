import {readFile,writeFile,mkdir} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {exportShare} from "../src/studio/share.ts";
const evidence=JSON.parse(await readFile(".panostem-runtime/smoke-evidence.json","utf8"));
const run=evidence.renders.find(r=>r.template==="physics");
if(!run?.decoded)throw new Error("A decoded real physics render is required");
const scene={version:1,id:"panostem-example-oscillator",title:"A harmonic oscillator",description:"A dot follows x(t) = 2 cos(2t), animated by a standard ManimGL updater.",entry:"main.py",scene:"OscillatorScene",license:"AGPL-3.0-only (example source and demonstration)",concept_ids:["simple-harmonic-motion"],learning_objectives:["Observe periodic motion and the effect of angular frequency."],parameters:{omega:{type:"number",min:0.1,max:8,default:2}}};
const bytes=await exportShare(scene,[
{path:"media/oscillator.mp4",role:"video",data:new Uint8Array(await readFile(run.movie))},
{path:"media/thumbnail.png",role:"thumbnail",data:new Uint8Array(await readFile(resolve(dirname(run.movie),"thumbnail.png")))},
{path:"source/main.py",role:"source",data:new Uint8Array(await readFile("src-tauri/runtime/examples/physics.py"))},
{path:"NOTICE.txt",role:"notice",data:new TextEncoder().encode("Panostem demonstration. Source and rendered demonstration distributed under AGPL-3.0-only. Upstream ManimGL is MIT. No external assets or textbooks are included. See https://github.com/styayur/panostem for corresponding source and license.")}
]);
await mkdir("public/examples",{recursive:true});await writeFile("public/examples/oscillator.panostem.zip",bytes);
process.stdout.write(String(`Built actual rendered oscillator share: ${bytes.length} bytes`)+"\n");
