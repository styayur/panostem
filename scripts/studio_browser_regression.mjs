import assert from "node:assert/strict";
import {mkdir,readFile} from "node:fs/promises";
import {importShare} from "../src/studio/share.ts";

export async function studioRegression(browser,base) {
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  try {
    await page.goto(`${base}?route=studio&example=oscillator`);
    await page.waitForLoadState("networkidle");
    await page.locator("video").waitFor();
    await page.waitForFunction(()=>document.querySelector("video")?.readyState>=2);
    assert.equal(await page.getByRole("button",{name:"Render video",exact:true}).count(),0);
    assert.equal(await page.getByRole("button",{name:"Install / repair runtime",exact:true}).count(),0);
    assert.equal(await page.locator("video").evaluate(v=>v.duration),4);
    await page.locator("video").evaluate(v=>{v.currentTime=0;return v.play();});
    await page.waitForFunction(()=>document.querySelector("video").currentTime>1);
    await page.locator("video").evaluate(v=>v.pause());
    await page.waitForFunction(()=>{const v=document.querySelector("video");return v&&!v.seeking&&v.readyState>=2;});
    await page.getByText("source/main.py (Included source)",{exact:true}).click();
    assert.ok((await page.locator(".studio-shared-source").first().textContent()).includes("from manimlib import *"));
    const download=page.waitForEvent("download");
    await page.getByRole("button",{name:"Export share ZIP",exact:true}).click();
    const result=await download;
    const parsed=await importShare(new Uint8Array(await readFile(await result.path())));
    assert.ok(parsed.manifest.files.every(f=>f.role!=="source"),"source must remain opt-in on re-export");
    await page.getByLabel("Include selected Python source (opt-in)").check();
    const second=page.waitForEvent("download");
    await page.getByRole("button",{name:"Export share ZIP",exact:true}).click();
    const included=await importShare(new Uint8Array(await readFile(await (await second).path())));
    assert.ok(included.manifest.files.some(f=>f.role==="source"));
    if(process.env.PANOSTEM_CAPTURE==="1") {
      await page.getByLabel("Include selected Python source (opt-in)").uncheck();
      await page.getByText("source/main.py (Included source)",{exact:true}).click();
      await mkdir("docs",{recursive:true});await page.screenshot({path:"docs/studio-web.png"});
    }
    await page.getByLabel("Import share ZIP",{exact:true}).setInputFiles({name:"bad.zip",mimeType:"application/zip",buffer:Buffer.from("invalid")});
    await page.getByRole("alert").waitFor();
    assert.ok((await page.getByRole("alert").textContent()).includes("ZIP"));
    await page.getByLabel("Import share ZIP",{exact:true}).setInputFiles("public/examples/oscillator.panostem.zip");
    await page.getByRole("button",{name:/Open concept: simple harmonic motion/}).waitFor();
    await page.getByRole("button",{name:/Open concept: simple harmonic motion/}).click();
    await page.getByTestId("learning-panel").waitFor();
    assert.equal(await page.getByTestId("learning-panel").getAttribute("data-learning-concept"),"simple-harmonic-motion");
    for(const [locale,name,label] of [["zh-CN","简体中文","播放与分享"],["zh-TW","繁體中文","播放與分享"],["en","English","Playback and sharing"]]) {
      await page.goto(`${base}?route=studio&example=oscillator`);
      await page.getByTitle(/Language & translation|语言与翻译|語言與翻譯/).click();
      await page.getByRole("button",{name,exact:true}).click();
      await page.getByRole("heading",{name:label,exact:true}).waitFor();
      assert.equal(await page.locator("html").getAttribute("lang"),locale);
    }
    await page.emulateMedia({reducedMotion:"reduce"});await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),"no horizontal overflow at 390px");
    await page.keyboard.press("Tab");
    assert.ok(await page.evaluate(()=>document.activeElement!==document.body));
    assert.deepEqual(errors,[]);
    process.stdout.write(String("STUDIO BROWSER: actual video decode/seek, source opt-in, share download/re-import, corruption rejection, concept navigation, three locales, 390px and reduced motion PASS")+"\n");
  } finally {await context.close();}
}
