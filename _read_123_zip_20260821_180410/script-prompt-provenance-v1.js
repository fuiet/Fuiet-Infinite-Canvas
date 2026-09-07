/* Fuiet Script · Prompt Provenance V1
 * Preserves the script-final prompt captured when a production node is created,
 * while separately recording the generator-confirmed prompt and the final
 * provider prompt submitted to /api/tasks.
 */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FuietScriptPromptProvenanceV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';

const clean=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const clone=value=>{try{return JSON.parse(JSON.stringify(value??null))}catch{return null}};
const esc=value=>clean(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
const now=()=>new Date().toISOString();

function readState(){
  try{
    const raw=root.CanvasBrowserStorageManager?.getItem?.('libtv-clone-state');
    return raw?JSON.parse(raw):null;
  }catch{return null}
}
function scriptContextFromTask(task={},state=readState()){
  const params=task.parameters||{},scriptNodeId=clean(params.scriptNodeId),shotId=clean(params.shotId),type=clean(task.nodeType).toLowerCase();
  if(!scriptNodeId||!shotId||!['image','video'].includes(type))return null;
  const nodes=list(state?.nodes),scriptNode=nodes.find(node=>String(node?.id)===scriptNodeId&&node?.type==='script'),data=scriptNode?.scriptData;
  const shot=list(data?.shots).find(item=>String(item?.id)===shotId);if(!data||!shot)return null;
  return{state,nodes,params,scriptNodeId,shotId,type,scriptNode,data,shot};
}
function selectedProductionNode(ctx,task={}){
  if(!ctx)return null;
  const key=ctx.type==='video'?'selectedVideoNodeId':'selectedImageNodeId',selectedId=clean(ctx.shot?.outputs?.[key]);
  const matches=node=>node&&clean(node.type).toLowerCase()===ctx.type&&clean(node.toolParams?.scriptNodeId)===ctx.scriptNodeId&&clean(node.toolParams?.shotId)===ctx.shotId;
  const candidates=ctx.nodes.filter(matches);if(!candidates.length)return null;
  const prompt=clean(task.prompt),activeStatuses=new Set(['queued','fallback','retrying','running','polling','provider_succeeded','result_pending']);
  const activeExact=[...candidates].reverse().find(node=>activeStatuses.has(clean(node.taskStatus).toLowerCase())&&clean(node.prompt)===prompt);if(activeExact)return activeExact;
  const exact=[...candidates].reverse().find(node=>clean(node.prompt)===prompt);if(exact)return exact;
  const selected=ctx.nodes.find(node=>String(node?.id)===selectedId);if(matches(selected))return selected;
  const active=[...candidates].reverse().find(node=>activeStatuses.has(clean(node.taskStatus).toLowerCase()));return active||candidates[candidates.length-1];
}
function legacySourcePrompt(ctx){return clean(ctx?.type==='video'?ctx?.shot?.videoPrompt:ctx?.shot?.imagePrompt)}
function sourceRecord(task={},state=readState()){
  const ctx=scriptContextFromTask(task,state);if(!ctx)return null;
  const node=selectedProductionNode(ctx,task),snapshot=node?.generationSnapshot||{},explicit=snapshot?.promptProvenance?.source||{};
  const prompt=clean(explicit.prompt||snapshot.sourcePrompt||snapshot.prompt||legacySourcePrompt(ctx));
  const promptSource=clone(explicit.promptSource||snapshot.promptSource||ctx.shot?.promptSource||{})||{};
  const promptRevision=Number(explicit.promptRevision??snapshot.promptRevision??ctx.shot?.promptRevision??0)||0;
  const promptGeneratedAt=clean(explicit.promptGeneratedAt||snapshot.promptGeneratedAt||ctx.shot?.promptGeneratedAt);
  const capturedAt=clean(explicit.capturedAt||snapshot.createdAt||promptGeneratedAt);
  const method=clean(explicit.method)||(ctx.data?.aiSynthesizedAt?'ai_synthesized':'confirmed_final');
  const sourceNodeId=clean(node?.id);
  return{
    version:1,
    kind:'script_final_prompt',
    method,
    prompt,
    scriptNodeId:ctx.scriptNodeId,
    shotId:ctx.shotId,
    shotNo:Number(ctx.shot?.no||snapshot.shotNo||0),
    type:ctx.type,
    productionNodeId:sourceNodeId,
    promptRevision,
    promptGeneratedAt,
    capturedAt,
    promptSource
  };
}
function buildTaskProvenance(task={},options={}){
  const state=options.state||readState(),source=sourceRecord(task,state);if(!source)return null;
  const generatorPrompt=clean(options.generatorPrompt!==undefined?options.generatorPrompt:task.prompt),providerPrompt=clean(options.providerPrompt!==undefined?options.providerPrompt:task.prompt);
  const manuallyEdited=generatorPrompt!==source.prompt,providerDiffers=providerPrompt!==source.prompt,submittedAt=clean(options.submittedAt)||now();
  return{
    version:1,
    source,
    execution:{
      generatorPrompt,
      providerPrompt,
      manuallyEdited,
      providerDiffersFromSource:providerDiffers,
      confirmedAt:submittedAt,
      submittedAt
    }
  };
}
function activeNodeId(){
  if(typeof document==='undefined')return'';
  return clean(document.querySelector('.node.selected[data-id]')?.dataset?.id||document.querySelector('.node[data-interaction-state="selected"][data-id]')?.dataset?.id);
}
function taskLikeForNode(state={},nodeId=''){
  const nodes=list(state.nodes),node=nodes.find(item=>String(item?.id)===String(nodeId));if(!node)return null;
  const scriptNodeId=clean(node.toolParams?.scriptNodeId),shotId=clean(node.toolParams?.shotId),type=clean(node.type).toLowerCase();
  if(!scriptNodeId||!shotId||!['image','video'].includes(type))return null;
  return{nodeType:type,prompt:node.prompt||'',parameters:{scriptNodeId,shotId}};
}
function shortPrompt(value,max=220){const text=clean(value);return text.length>max?text.slice(0,max)+'…':text}
function provenanceHtml(provenance){
  if(!provenance)return'';
  const source=provenance.source,execution=provenance.execution,status=execution.manuallyEdited?'已人工调整':'与脚本最终提示词一致';
  return`<details class="script-prompt-provenance" data-script-prompt-provenance><summary><span>提示词来源</span><b>脚本最终提示词</b><em class="${execution.manuallyEdited?'edited':'same'}">${status}</em></summary><div class="script-prompt-provenance-body"><section><header>来源 Prompt</header><p>${esc(shortPrompt(source.prompt))}</p><small>Shot ${Number(source.shotNo||0)||'—'} · revision ${Number(source.promptRevision||0)}${source.method==='ai_synthesized'?' · AI 合成':' · 已确认最终版'}</small></section><section><header>当前执行 Prompt</header><p>${esc(shortPrompt(execution.generatorPrompt))}</p><small>${execution.manuallyEdited?'生成器确认阶段存在人工修改':'未在生成器确认阶段修改'}</small></section></div></details>`;
}
function renderGeneratorAudit(){
  if(typeof document==='undefined')return null;
  const panel=document.querySelector('#generatorPanel');if(!panel||panel.classList.contains('hidden'))return null;
  const main=panel.querySelector('.image-generator-main,.video-generator-main');if(!main)return null;
  const state=readState(),nodeId=activeNodeId(),task=taskLikeForNode(state||{},nodeId),old=main.querySelector('[data-script-prompt-provenance]');
  if(!task){old?.remove();return null}
  const input=main.querySelector('#promptInput'),generatorPrompt=input?.value??task.prompt,provenance=buildTaskProvenance(task,{state,generatorPrompt,providerPrompt:generatorPrompt,submittedAt:'preview'});
  if(!provenance){old?.remove();return null}
  const signature=[provenance.source.prompt,provenance.execution.generatorPrompt,provenance.source.promptRevision].join('\u0000');
  let hash=2166136261;for(let i=0;i<signature.length;i++){hash^=signature.charCodeAt(i);hash=Math.imul(hash,16777619)}const sig=String(hash>>>0);
  if(old?.dataset?.signature===sig)return provenance;
  const html=provenanceHtml(provenance),promptBox=main.querySelector('.prompt-box');
  if(old)old.outerHTML=html;else if(promptBox)promptBox.insertAdjacentHTML('beforebegin',html);else main.insertAdjacentHTML('beforeend',html);
  const current=main.querySelector('[data-script-prompt-provenance]');if(current)current.dataset.signature=sig;
  return provenance;
}
function install(){
  if(typeof document==='undefined'||typeof MutationObserver==='undefined')return;
  const panel=document.querySelector('#generatorPanel');if(!panel)return;
  let queued=false;const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;renderGeneratorAudit()})};
  new MutationObserver(schedule).observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  panel.addEventListener('input',event=>{if(event.target?.id==='promptInput')schedule()});
  const nodeLayer=document.querySelector('#nodeLayer');if(nodeLayer)new MutationObserver(schedule).observe(nodeLayer,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-interaction-state']});
  schedule();
}

const api=Object.freeze({readState,scriptContextFromTask,selectedProductionNode,sourceRecord,buildTaskProvenance,taskLikeForNode,provenanceHtml,renderGeneratorAudit,install});
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install()}
return api;
});
