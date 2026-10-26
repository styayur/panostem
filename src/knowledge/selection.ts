import { create } from "zustand";
/** Internal navigation only. Selection never runs Python or grants project trust. */
export const useModelSelection = create<{model:string|null;example:string|null;template:string|null;select:(id:string,mode:"example"|"template"|"model")=>void;clear:()=>void}>((set)=>({
  model:null,example:null,template:null,select:(id,mode)=>set({model:mode==="model"?id:null,example:mode==="example"?id:null,template:mode==="template"?id:null}),clear:()=>set({model:null,example:null,template:null}),
}));
