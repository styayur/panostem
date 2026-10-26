"""Real browser regression for local-only import. Uses a running Vite server."""
import argparse
import json
import os
import sys
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:1425/')
parser.add_argument('--out', default='.panostem-runtime/vextessera-audit')
args=parser.parse_args()
for attempt in range(100):
    try:
        with urllib.request.urlopen(args.base,timeout=2) as response:
            if response.status==200:break
    except OSError:pass
    time.sleep(.1)
else:raise RuntimeError('Vite server did not become ready')
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
secret='PRIVATE_KNOWLEDGE_SENTINEL_8e3eaf'
document=f'# Gradient experiment\n\nThe gradient of $f(x,y)=x^2+y^2$ is a vector.\n\n{secret}\n\n[[Prerequisite]]\n<script>window.documentCodeExecuted=true</script>'
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,**({'executable_path':os.environ['SVE_CHROMIUM']} if os.environ.get('SVE_CHROMIUM') else {}))
    for locale, label in [('en','Read documents'),('zh-CN','读取文档'),('zh-TW','讀取文件')]:
        context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
        requests=[];errors=[]
        context.on('request',lambda r:requests.append({'url':r.url,'body':r.post_data}))
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(args.base+'?route=knowledge');page.wait_for_load_state('networkidle')
        # Use the application's own settings API; exercise actual rendered file inputs.
        page.evaluate("""async locale => { const {useSettingsStore}=await import('/src/stores/settingsStore.ts');await useSettingsStore.getState().update({ui_locale:locale}); }""",locale)
        page.get_by_label(label,exact=True).set_input_files({'name':'experiment.md','mimeType':'text/markdown','buffer':document.encode()})
        page.locator('.knowledge-document').wait_for();assert secret in page.locator('.knowledge-document').inner_text()
        assert page.evaluate('window.documentCodeExecuted') is None
        assert page.locator('.knowledge-layout article pre').count() >= 2
        page.get_by_role('searchbox').fill('nonexistent');assert page.locator('.knowledge-layout > aside button').count()==0
        page.get_by_role('searchbox').fill('gradient');assert page.locator('.knowledge-layout > aside button').count()==1
        page.locator('.knowledge-layout article .knowledge-tools button').first.click()
        page.locator('.wb-inspector .knowledge-matches button').first.wait_for()
        page.locator('.wb-inspector .knowledge-matches button').first.click()
        page.locator('.knowledge-document').wait_for()
        page.screenshot(path=str(out/f'knowledge-{locale}.png'),full_page=True)
        for width in (390,768,1440):
            page.set_viewport_size({'width':width,'height':844});page.wait_for_timeout(80)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),f'{locale} overflow at {width}'
        clear={'en':'Clear index','zh-CN':'清理索引','zh-TW':'清理索引'}[locale]
        undo={'en':'Undo','zh-CN':'撤销','zh-TW':'復原'}[locale]
        page.get_by_role('button',name=clear,exact=True).click();assert page.locator('.knowledge-document').count()==0
        page.get_by_role('button',name=undo,exact=True).click();page.locator('.knowledge-document').wait_for()
        assert not any(secret in r['url'] or secret in (r['body'] or '') for r in requests)
        assert not any(r['url'].startswith('https://api.mymemory.translated.net/') for r in requests),'Local knowledge must not enter translation requests'
        page.reload();page.wait_for_load_state('networkidle');assert page.locator('.knowledge-document').count()==0
        model_button={'en':'Mathematical models','zh-CN':'数学模型','zh-TW':'數學模型'}[locale]
        page.get_by_role('button',name=model_button+' (14)',exact=True).click()
        page.locator('[data-model-id="newton"]').wait_for()
        page.wait_for_function('document.querySelector("video")?.readyState>=2')
        assert page.locator('.knowledge-models a[href*="github.com"]').count()>0
        playback={'en':'Open playback and source in Studio','zh-CN':'在创作室查看播放与源码','zh-TW':'在創作室檢視播放與原始碼'}[locale]
        page.get_by_role('button',name=playback,exact=True).click();page.locator('[data-testid="manimgl-studio"] video').wait_for()
        page.wait_for_function('document.querySelector("video")?.readyState>=2')
        assert page.get_by_role('button',name='Render video',exact=True).count()==0
        assert page.locator('.studio-shared-source').count()>0,'Included ordinary Python must be readable without execution'
        assert not errors,errors
        assert not errors,errors
        results.append({'locale':locale,'importReadOnly':True,'formulaAndSourceVisible':True,'conceptRoundTrip':True,'clearUndo':True,'noPrivateNetworkRequests':True,'responsive':[390,768,1440],'reducedMotion':True,'modelAndStudioPlayback':True,'webPythonUnavailable':True})
        context.close()
    browser.close()
(out/'knowledge-browser-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
sys.stdout.write('Knowledge browser: three locales, read-only import, source/formulas, concept round-trip, clear/undo, privacy and responsive checks PASS\n')
