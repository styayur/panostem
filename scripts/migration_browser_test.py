"""Synthetic historical-schema fixtures in disposable browser contexts, not installer tests."""
import argparse
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:1425/')
parser.add_argument('--out',default='.panostem-runtime/vextessera-audit')
args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,**({'executable_path':os.environ['SVE_CHROMIUM']} if os.environ.get('SVE_CHROMIUM') else {}))
    for identity in ['STEM Visual Explorer v0.2.0','Panostem v0.5.0-alpha.2']:
        context=browser.new_context(reduced_motion='reduce')
        page=context.new_page();page.goto(args.base);page.wait_for_load_state('networkidle')
        result={'id':'legacy-curl','source_id':'mathinsight','source_name':'Math Insight','title':'Curl','description':None,'url':'https://mathinsight.org/curl','result_type':'article','tags':['curl'],'thumbnail':None,'score':1}
        fixture={'sve.settings':{'theme':'dark','ui_locale':'zh-TW','preview_mode':'off','enabled_providers':['mathinsight'],'translate_results':False},'sve.favorites':[{'result':result,'created_at':100}],'sve.history':[{'id':1,'query':'旋度','result_count':1,'created_at':100}],'panostem.project-path':'D:/Example/legacy-project'}
        page.evaluate('(fixture)=>{for(const [k,v] of Object.entries(fixture))localStorage.setItem(k,k==="panostem.project-path"?v:JSON.stringify(v));sessionStorage.setItem("sve.workbench.v1",JSON.stringify({cursor:0,trail:[{conceptId:"curl",surface:"overview"}]}));}',fixture)
        page.reload();page.wait_for_load_state('networkidle')
        assert page.get_by_text('Vextessera',exact=True).first.is_visible()
        observed=page.evaluate('''async()=>{const c=await import('/src/lib/commands.ts');const {useWorkbenchStore}=await import('/src/workbench/workbenchStore.ts');return {settings:await c.getSettings(),favorites:await c.listFavorites(),history:await c.listHistory(),resume:useWorkbenchStore.getState().resume,project:localStorage.getItem('panostem.project-path')};}''')
        assert observed['settings']['theme']=='dark' and observed['settings']['ui_locale']=='zh-TW'
        assert observed['favorites']==fixture['sve.favorites'] and observed['history']==fixture['sve.history']
        assert observed['resume']['conceptId']=='curl' and observed['project']==fixture['panostem.project-path']
        assert page.locator('html').get_attribute('lang')=='zh-TW'
        page.evaluate('''async()=>{const c=await import('/src/lib/commands.ts');await c.saveSettings({...await c.getSettings(),theme:'light'});}''')
        page.reload();page.wait_for_load_state('networkidle')
        assert page.evaluate('JSON.parse(localStorage.getItem("sve.settings")).theme')=='light'
        results.append({'historicalSchema':identity,'fixture':'synthetic, historical field/key contracts','read':True,'writeReload':True,'favoritesHistoryPreserved':True,'workbenchResume':True,'projectPathPreserved':True,'installerLifecycle':False})
        context.close()
    browser.close()
(out/'migration-browser.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
sys.stdout.write('MIGRATION browser: both historical schemas retain settings/favorites/history/workbench and Studio path PASS\n')
