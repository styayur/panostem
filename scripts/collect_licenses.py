"""Collect actual installed dependency metadata/texts; never infer missing rights."""
import argparse
import json
from pathlib import Path
import subprocess
import sys

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument("--runtime-python")
parser.add_argument("--preserve-base-notices",action="store_true",help="Keep existing notice bytes and write newly collected package texts to a separate supplement")
args=parser.parse_args()
dest=root/"licenses"
dest.mkdir(exist_ok=True)
texts=[]
def collect(folder,label):
    candidates=[]
    for pattern in ("LICENSE*","LICENCE*","COPYING*","NOTICE*","license*","licence*"):
        candidates.extend(folder.glob(pattern))
    found=[]
    for p in sorted(set(candidates)):
        if p.is_file() and p.stat().st_size < 2*1024*1024:
            text=p.read_text(encoding="utf-8",errors="replace")
            texts.append(f"\n{'='*72}\n{label} — {p.name}\n{'='*72}\n{text}\n")
            found.append(p.name)
    return found

lock=json.loads((root/"package-lock.json").read_text())
npm=[]
for name,info in sorted(lock["packages"].items()):
    if not name or info.get("dev") or info.get("optional"):continue
    folder=root/name
    if not (folder/"package.json").exists():raise RuntimeError(f"Missing npm package: {name}; run npm ci")
    pkg=json.loads((folder/"package.json").read_text())
    declared=pkg.get("license") or " AND ".join(p.get("type","UNDECLARED") for p in pkg.get("licenses",[]) if isinstance(p,dict)) or "UNDECLARED"
    npm.append({"name":pkg["name"],"version":pkg["version"],"license":declared,"source":info.get("resolved"),"integrity":info.get("integrity"),"texts":collect(folder,f"npm {pkg['name']} {pkg['version']}")})
(dest/"npm-inventory.json").write_text(json.dumps(npm,indent=2),encoding="utf-8")

data=json.loads(subprocess.check_output(["cargo","metadata","--locked","--format-version","1","--manifest-path",str(root/"src-tauri/Cargo.toml")],cwd=root,text=True))
rust=[]
for pkg in sorted(data["packages"],key=lambda p:(p["name"],p["version"])):
    if pkg["name"]=="panostem":continue
    folder=Path(pkg["manifest_path"]).parent
    rust.append({"name":pkg["name"],"version":pkg["version"],"license":pkg.get("license") or "UNDECLARED","source":pkg.get("source"),"texts":collect(folder,f"Rust {pkg['name']} {pkg['version']}")})
(dest/"rust-build-inventory.json").write_text(json.dumps(rust,indent=2),encoding="utf-8")
if args.runtime_python:
    probe="""import importlib.metadata as m,json
out=[]
for d in m.distributions():
 files=[]
 for f in d.files or []:
  if any(part.lower().startswith(('license','licence','copying','notice')) for part in f.parts) and d.locate_file(f).is_file():
   p=d.locate_file(f)
   if p.stat().st_size<2*1024*1024:files.append({'name':str(f),'text':p.read_text(encoding='utf-8',errors='replace')})
 out.append({'name':d.metadata['Name'],'version':d.version,'license':d.metadata.get('License-Expression') or d.metadata.get('License') or 'UNDECLARED','texts':files,'source':json.loads(d.read_text('direct_url.json') or '{}')})
print(json.dumps(sorted(out,key=lambda x:x['name'].lower())))
"""
    python=json.loads(subprocess.check_output([args.runtime_python,"-c",probe],text=True,encoding="utf-8"))
    for pkg in python:
        for entry in pkg["texts"]:texts.append(f"\n{'='*72}\nPython {pkg['name']} {pkg['version']} — {entry['name']}\n{'='*72}\n{entry['text']}\n")
        pkg["texts"]=[entry["name"] for entry in pkg["texts"]]
    (dest/"python-runtime-inventory.json").write_text(json.dumps(python,indent=2),encoding="utf-8")
notice_file=dest/"THIRD_PARTY_LICENSE_TEXTS.txt"
if args.preserve_base_notices and notice_file.exists():
    existing=notice_file.read_text(encoding="utf-8")
    additional=[text for text in texts if text.splitlines()[2] not in existing]
    (dest/"KNOWLEDGE_DEPENDENCY_LICENSE_TEXTS.txt").write_bytes(("Additional actual dependency notices for the knowledge pipeline.\nExisting notices remain in THIRD_PARTY_LICENSE_TEXTS.txt; explicit missing-package grants remain in supplemental/.\n"+"".join(additional)).encode("utf-8"))
else:
    notice_file.write_text("Actual installed dependency license and notice texts.\nRust inventory includes build/platform dependencies; not all are distributed.\n"+"".join(texts),encoding="utf-8")
sys.stdout.write(f"Collected {len(npm)} npm dependencies, {len(rust)} Rust build dependencies and actual runtime metadata/texts\n")
