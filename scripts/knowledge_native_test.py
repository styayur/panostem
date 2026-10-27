"""Actual Windows WebView2 model -> Studio -> reviewed render regression.

Requires an explicitly isolated audit identifier; refuses production profiles.
"""
import argparse
import hashlib
import json
import sys
import subprocess
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--cdp',default='http://127.0.0.1:9223')
parser.add_argument('--base',default='http://127.0.0.1:1425')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.connect_over_cdp(args.cdp)
    context=browser.contexts[0]
    page=next(page for page in context.pages if page.url.startswith(args.base))
    def invoke(command,**arguments):
        return page.evaluate('async p => window.__TAURI_INTERNALS__.invoke(p.command,p.arguments)',{'command':command,'arguments':arguments})
    assert invoke('plugin:app|identifier')=='org.stemvisualexplorer.audit20260929','Refusing to change a production profile'
    product=invoke('plugin:app|name')
    version=invoke('plugin:app|version')
    assert product=='Vextessera' and version==json.loads((root/'package.json').read_text(encoding='utf-8'))['version']
    page.goto(args.base+'/?route=knowledge');page.wait_for_load_state('networkidle')
    page.evaluate('async ()=>{const {useSettingsStore}=await import("/src/stores/settingsStore.ts");await useSettingsStore.getState().update({ui_locale:"en"});}')
    page.get_by_role('button',name='Mathematical models (14)',exact=True).click()
    page.locator('[data-model-id="newton"]').wait_for()
    page.get_by_role('button',name='Create a Studio project from this model',exact=True).click()
    page.locator('[data-testid="manimgl-studio"]').wait_for()
    project=root/'.panostem-runtime'/f'native-knowledge-{time.time_ns()}'
    page.get_by_label('Project directory (absolute path)',exact=True).fill(str(project))
    assert page.get_by_label('Template',exact=True).input_value()=='knowledge-newton'
    page.get_by_role('button',name='Create project',exact=True).click()
    page.locator('.cm-content').wait_for()
    assert page.get_by_role('button',name='Render video',exact=True).is_disabled()
    info=invoke('studio_request',request={'action':'inspect','project':str(project)})
    model=json.loads((project/'model.json').read_text(encoding='utf-8'))
    assert model['conceptIds']==['derivative','iteration']
    catalog=json.loads((root/'src/knowledge/models.json').read_text(encoding='utf-8'))
    expected=next(m for m in catalog if m['id']=='newton')
    assert hashlib.sha256((project/'main.py').read_bytes()).hexdigest()==expected['sourceHash']
    page.get_by_label('I trust this project revision',exact=False).check()
    page.get_by_role('button',name='Render video',exact=True).click()
    job=None
    for _ in range(600):
        jobs=invoke('studio_tasks')
        job=next((j for j in jobs if j['project']==str(project) and j['action']=='run'),None)
        if job and job['status']!='running':break
        time.sleep(.2)
    assert job and job['status']=='completed',job
    assert job['result']['revision']==info['revision']
    movie=next(m for m in job['result']['media'] if m['path'].endswith('.mp4'))
    subprocess.run([str(root/'.panostem-runtime/bin/ffmpeg.exe'),'-v','error','-i',str(project/movie['path']),'-f','null','-'],check=True,timeout=60,capture_output=True)
    page.locator('video').wait_for();page.wait_for_function('document.querySelector("video")?.readyState>=2')
    page.screenshot(path=str(root/'.panostem-runtime/vextessera-audit/native-knowledge.png'))
    evidence={'identifier':'org.stemvisualexplorer.audit20260929','product':product,'version':version,'project':str(project),'projectRevision':info['revision'],'sourceHash':expected['sourceHash'],'model':'newton','createdWithoutExecution':True,'untrustedRunDisabled':True,'nativeRender':job['result'],'playback':True}
    (root/'.panostem-runtime/vextessera-audit/native-knowledge.json').write_text(json.dumps(evidence,indent=2),encoding='utf-8')
    browser.close()
sys.stdout.write('Native knowledge: model -> ordinary project -> revision trust -> actual embedded-template render and video playback PASS\n')
