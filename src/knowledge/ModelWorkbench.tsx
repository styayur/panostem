import { useState } from "react";
import { knowledgeModels, knowledgeModelById } from "./catalog";
import { useSettingsStore } from "../stores/settingsStore";
import { IS_TAURI } from "../lib/commands";
import { L, localize } from "../learning/types";
import { useModelSelection } from "./selection";
import { httpUrl } from "../lib/urls";
const ui={
  models:L("Mathematical models","数学模型","數學模型"),
  equations:L("Equations and definitions","方程与定义","方程與定義"),
  assumptions:L("Assumptions and conditions","假设与条件","假設與條件"),
  verification:L("Independent verification","独立验证","獨立驗證"),
  sources:L("Source evidence","来源证据","來源證據"),
  derived:L("The numerical example is independently derived from the cited equation. Verification covers the listed model and assumptions.","数值示例根据引用方程独立推导。验证仅覆盖所列模型与假设。","數值範例根據引用方程獨立推導。驗證僅涵蓋所列模型與假設。"),
  play:L("Open playback and source in Studio","在创作室查看播放与源码","在創作室檢視播放與原始碼"),
  template:L("Create a Studio project from this model","从此模型创建 Studio 项目","從此模型建立 Studio 專案"),
  local:L("Local generation available in the desktop app; media redistribution remains under review.","桌面版可本地生成；媒体再分发许可仍待审查。","桌面版可在本機產生；媒體再散布授權仍待審查。"),
  execution:L("Creating or viewing a project does not execute Python. Running requires reviewing and trusting its exact source revision.","创建或查看项目不会执行 Python。运行需要审阅并信任确切源码版本。","建立或檢視專案不會執行 Python。執行需要審閱並信任確切原始碼版本。"),
};
export default function ModelWorkbench({initialId}:{initialId?:string|null}) {
  const locale=useSettingsStore(s=>s.settings.ui_locale),setPage=useSettingsStore(s=>s.setPage);
  const [id,setId]=useState(initialId??knowledgeModels[0]?.id);
  const item=knowledgeModelById.get(id)??knowledgeModels[0];
  const t=(key:keyof typeof ui)=>localize(ui[key],locale);
  if(!item)return null;
  const studio=(mode:"example"|"template")=>{useModelSelection.getState().select(item.id,mode);setPage("studio");};
  return <div className="knowledge-layout knowledge-models">
    <aside aria-label={t("models")}>{knowledgeModels.map(m=><button key={m.id} aria-pressed={m.id===item.id} onClick={()=>setId(m.id)}>{localize(m.title,locale)}</button>)}</aside>
    <article data-model-id={item.id}><h2>{localize(item.title,locale)}</h2><p>{t("derived")}</p>
      {item.mediaPath?<><video controls preload="metadata" src={`${import.meta.env.BASE_URL}${item.mediaPath}?v=${item.mediaHash}`} aria-label={localize(item.title,locale)} /><div className="knowledge-tools"><button onClick={()=>studio("example")}>{t("play")}</button></div></>:<p>{t("local")}</p>}
      {IS_TAURI&&<div className="knowledge-tools"><button onClick={()=>studio("template")}>{t("template")}</button></div>}
      <p>{t("execution")}</p>
      <h3>{t("equations")}</h3>{item.model.equations.map(eq=><pre key={eq}>{eq}</pre>)}
      <dl>{item.model.variables.map(v=><div key={v.name}><dt>{v.name} [{v.unit}]</dt><dd>{v.domain}</dd></div>)}{Object.entries(item.model.parameters).map(([name,p])=><div key={name}><dt>{name}</dt><dd>{p.value} {p.unit}</dd></div>)}</dl>
      <h3>{t("assumptions")}</h3><ul>{[...item.model.assumptions,...item.model.initialConditions,...item.model.boundaryConditions].map((v,i)=><li key={i}>{v}</li>)}</ul>
      <h3>{t("verification")}</h3><ul>{item.model.invariants.map((v,i)=><li key={i}>{v}</li>)}</ul>
      <h3>{t("sources")}</h3>{item.sources.map(s=><p key={s.unitId}><a href={httpUrl(s.url)} target="_blank" rel="noreferrer">{s.location.path}{s.location.page?` [page ${s.location.page}, ${s.location.region??""}]`:`:${s.location.startLine}`}{s.location.cell===undefined?"":` [cell ${s.location.cell}]`}</a><br/><code>{s.revision}</code></p>)}
    </article>
  </div>;
}
