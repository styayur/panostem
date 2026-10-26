"""Verify the built GUI executable without launching its UI or reading user data."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root=Path(__file__).resolve().parents[1]
binary=Path(sys.argv[1]).resolve()
assert binary.is_file() and binary.stat().st_size>100000
if sys.platform=="win32":assert binary.read_bytes()[:2]==b"MZ"
info=json.loads(subprocess.check_output([str(binary),"--verify-build"],timeout=30,text=True))
package=json.loads((root/"package.json").read_text(encoding="utf-8-sig"))
config=json.loads((root/"src-tauri/tauri.conf.json").read_text(encoding="utf-8-sig"))
assert info["product"]==config["productName"]=="Vextessera"
assert info["version"]==info["app_version"]==package["version"]==config["version"]
assert info["bundle_identifier"]==config["identifier"]=="org.stemvisualexplorer.app"
assert info["runtime_commit"]=="f427fc67df75513be0cd3f3329e327a9a19401c3"
for key,file in (("requirements_sha256","requirements.lock"),("controller_sha256","controller.py")):
    assert info[key]==hashlib.sha256((root/"src-tauri/runtime"/file).read_bytes()).hexdigest()
for key,file in (("knowledge_catalog_sha256","knowledge_catalog.json"),("knowledge_helpers_sha256","knowledge_helpers.py")):
    assert info[key]==hashlib.sha256((root/"src-tauri/runtime/examples"/file).read_bytes()).hexdigest()
models=json.loads((root/"src/knowledge/models.json").read_text())
assert set(info["knowledge_template_hashes"])=={m["id"] for m in models}
for m in models:
    assert info["knowledge_template_hashes"][m["id"]]==m["sourceHash"]==hashlib.sha256((root/"src-tauri/runtime/examples"/f"knowledge_{m['id']}.py").read_bytes()).hexdigest()
sys.stdout.write(json.dumps({**info,"binary_sha256":hashlib.sha256(binary.read_bytes()).hexdigest()},indent=2)+"\n")
