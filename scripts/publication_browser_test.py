"""Exercise actual served app/model/media/share bytes; no external fixtures or Python execution."""
import argparse
import hashlib
import io
import json
import os
import sys
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',required=True)
parser.add_argument('--out',default='.panostem-runtime/vextessera-audit/public-web')
args=parser.parse_args()
base=args.base.rstrip('/')+'/'
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
catalog=json.loads((Path(__file__).resolve().parents[1]/'src/knowledge/models.json').read_text(encoding='utf-8'))
results={'base':base,'models':[],'queries':[],'pythonExecution':False}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,**({'executable_path':os.environ['SVE_CHROMIUM']} if os.environ.get('SVE_CHROMIUM') else {}))
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    response=page.goto(base);assert response.status==200
    page.wait_for_load_state('networkidle')
    assert page.title()=='Vextessera'
    manifest=context.request.get(base+'index/manifest.json').json()
    assert len(manifest)==7 and sum(provider['count'] for provider in manifest)==1555
    for query in ['gradient','旋度','駐波','site:falstad wave']:
        page.locator('#search-input').fill(query);page.locator('#search-input').press('Enter')
        page.locator('[role="option"]').first.wait_for()
        results['queries'].append({'query':query,'rows':page.locator('[role="option"]').count()})
    # Search must expose a reviewed model and preserve its exact source evidence.
    page.locator('#search-input').fill('newton');page.locator('#search-input').press('Enter')
    page.locator('.knowledge-matches button').filter(has_text='Newton iteration').first.click()
    page.locator('[data-model-id="newton"]').wait_for()
    assert page.locator('[data-model-id="newton"] a').first.get_attribute('href')==catalog[0]['sources'][0]['url']
    for model in catalog:
        page.get_by_role('button',name=model['title']['en'],exact=True).click()
        article=page.locator(f'[data-model-id="{model["id"]}"]');article.wait_for()
        links=article.locator('a').evaluate_all('(links)=>links.map(a=>a.href)')
        assert links==[source['url'] for source in model['sources']]
        assert article.get_by_role('heading',name='Independent verification',exact=True).is_visible()
        evidence={'id':model['id'],'sources':links,'localGenerationOnly':not bool(model['mediaPath'])}
        if model['mediaPath']:
            media=context.request.get(base+model['mediaPath']);assert media.status==200
            assert hashlib.sha256(media.body()).hexdigest()==model['mediaHash']
            archive=context.request.get(base+model['sharePath']);assert archive.status==200
            assert hashlib.sha256(archive.body()).hexdigest()==model['shareHash']
            video=article.locator('video');video.wait_for()
            page.wait_for_function('document.querySelector("video")?.readyState>=3')
            video.evaluate('(v)=>{v.currentTime=0;return v.play();}')
            page.wait_for_function('document.querySelector("video").currentTime>0.25')
            video.evaluate('(v)=>v.pause()')
            evidence.update({'videoDecodedAndPlayed':True,'mediaHash':model['mediaHash'],'shareHash':model['shareHash']})
        else:
            assert article.locator('video').count()==0
        results['models'].append(evidence)
    page.get_by_role('button',name='Newton iteration',exact=True).click()
    page.get_by_role('button',name='Open playback and source in Studio',exact=True).click()
    page.locator('video').wait_for();page.wait_for_function('document.querySelector("video")?.readyState>=2')
    assert page.get_by_role('button',name='Render video',exact=True).count()==0
    assert page.get_by_role('button',name='Install / repair runtime',exact=True).count()==0
    page.get_by_text('source/main.py (Included source)',exact=True).click()
    assert 'from manimlib import *' in page.locator('.studio-shared-source').first.inner_text()
    with page.expect_download() as download:
        page.get_by_role('button',name='Export share ZIP',exact=True).click()
    archive=Path(download.value.path()).read_bytes()
    with zipfile.ZipFile(io.BytesIO(archive)) as package:
        manifest=json.loads(package.read('manifest.json'))
        assert manifest['format']=='panostem-share'
        assert not any(file['role']=='source' for file in manifest['files'])
    page.get_by_label('Include selected Python source (opt-in)').check()
    with page.expect_download() as download:
        page.get_by_role('button',name='Export share ZIP',exact=True).click()
    copied=out/'newton-reexport.panostem.zip';download.value.save_as(str(copied))
    with zipfile.ZipFile(copied) as package:
        manifest=json.loads(package.read('manifest.json'))
        assert any(file['role']=='source' for file in manifest['files'])
    page.get_by_label('Import share ZIP',exact=True).set_input_files(str(copied))
    page.locator('video').wait_for();page.wait_for_function('document.querySelector("video")?.readyState>=2')
    results['shareRoundTrip']={'defaultSourceExcluded':True,'explicitSourceIncluded':True,'reimportPlayback':True}
    page.screenshot(path=str(out/'published-studio.png'))
    for locale,label in [('zh-CN','简体中文'),('zh-TW','繁體中文'),('en','English')]:
        page.get_by_title('Language & translation' if page.locator('html').get_attribute('lang')=='en' else ('语言与翻译' if page.locator('html').get_attribute('lang')=='zh-CN' else '語言與翻譯')).click()
        page.get_by_role('button',name=label,exact=True).click()
        assert page.locator('html').get_attribute('lang')==locale
        # Dismiss the popover before changing locale again.
        page.keyboard.press('Escape')
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    results.update({'sourceModelStudioNavigation':True,'locales':['zh-CN','zh-TW','en'],'mobile390':True,'reducedMotion':True,'errors':errors})
    browser.close()
(out/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
sys.stdout.write('PUBLIC APP: actual served indexes/search, fourteen source links, six media/share byte hashes and playback, source-opt-in share round-trip, locales/mobile PASS\n')
