/* Fuiet Script · Prompt Asset Source V1
 * Keeps the asset set used by final-prompt composition aligned with the stable
 * shot.assetRefs + promptSource revision snapshot used by dirty tracking.
 * Also keeps workflow.promptsReady and scriptData.finalized aligned so batch
 * production consumes the confirmed AI/manual prompts instead of re-running the
 * legacy rule composer just because finalized was left false.
 */
(()=>{
'use strict';
const Core=globalThis.FuietScriptWorkflowCore;
const manager=globalThis.CanvasBrowserStorageManager;
if(!Core||globalThis.FuietPromptAssetSourceV1)return;

const text=v=>String(v??'');
const arr=v=>Array.isArray(v)?v:[];
const ownerByShot=new WeakMap();
const originals={
  normalizeScriptData:Core.normalizeScriptData,
  markShotReady:Core.markShotReady,
  setPromptResult:Core.setPromptResult,
  shotPromptSourceSnapshot:Core.shotPromptSourceSnapshot,
  isPromptSourceCurrent:Core.isPromptSourceCurrent,
  invalidateShotsForAsset:Core.invalidateShotsForAsset
};
if(Object.values(originals).some(fn=>typeof fn!=='function'))return;

function trackOwners(data){
  if(!data||typeof data!=='object')return data;
  for(const shot of arr(data.shots))if(shot&&typeof shot==='object')ownerByShot.set(shot,data);
  return data;
}
function assetCatalog(data){
  return[
    ...arr(data?.assets?.characters),
    ...arr(data?.assets?.scenes),
    ...arr(data?.assets?.props)
  ];
}
function storedDataForShot(shot){
  if(!manager?.getItem||!shot?.id)return null;
  try{
    const state=JSON.parse(manager.getItem('libtv-clone-state')||'{}')||{};
    const node=arr(state.nodes).find(n=>n?.type==='script'&&arr(n.scriptData?.shots).some(s=>String(s.id)===String(shot.id)));
    return node?.scriptData||null;
  }catch{return null}
}
function effectiveAssetRefs(data,shot,providedRefs){
  if(!data||!shot)return arr(providedRefs??shot?.assetRefs);
  const catalog=assetCatalog(data),byId=new Map(catalog.filter(a=>a?.id).map(a=>[String(a.id),a])),ids=new Set();
  for(const rawId of arr(providedRefs??shot.assetRefs)){
    const asset=byId.get(String(rawId));
    if(asset?.id)ids.add(asset.id);
  }
  const blob=[shot?.characters,shot?.scene,shot?.props,shot?.action,shot?.dialogue].filter(Boolean).join(' ');
  for(const asset of catalog){
    if(asset?.id&&text(asset.name).trim()&&blob.includes(text(asset.name).trim()))ids.add(asset.id);
  }
  return [...ids];
}
function dataFor(shot,data){return data||ownerByShot.get(shot)||storedDataForShot(shot)}
function canonicalize(data,shot,providedRefs){
  const resolved=dataFor(shot,data);if(!resolved||!shot)return{data:resolved,refs:arr(providedRefs??shot?.assetRefs)};
  const refs=effectiveAssetRefs(resolved,shot,providedRefs);shot.assetRefs=refs;return{data:resolved,refs};
}
function promptsReady(data){
  const shots=arr(data?.shots);
  return Boolean(shots.length&&shots.every(shot=>text(shot?.imagePrompt).trim()&&text(shot?.videoPrompt).trim()&&!shot?.promptDirty&&shot?.promptStatus!=='error'));
}
function syncFinalization(data){
  if(!data||typeof data!=='object')return false;
  trackOwners(data);
  const ready=promptsReady(data),workflow=data.workflow||(data.workflow={});
  workflow.promptsReady=ready;
  if(ready){
    data.finalized=true;
    data.finalizedAt=new Date().toISOString();
    workflow.stage='ready';
  }else if(data.finalized){
    data.finalized=false;
  }
  workflow.updatedAt=new Date().toISOString();
  return ready;
}

Core.normalizeScriptData=function(data,options){
  const result=originals.normalizeScriptData.call(Core,data,options);
  trackOwners(result&&typeof result==='object'?result:data);
  if(result!==data)trackOwners(data);
  return result;
};
Core.markShotReady=function(shot,source){
  if(!shot)return originals.markShotReady.call(Core,shot,source);
  const owner=ownerByShot.get(shot);
  if(source){
    const result=originals.markShotReady.call(Core,shot,source);
    if(owner)syncFinalization(owner);
    return result;
  }
  const synced=canonicalize(null,shot);
  const result=synced.data
    ?originals.markShotReady.call(Core,shot,originals.shotPromptSourceSnapshot.call(Core,synced.data,shot,synced.refs))
    :originals.markShotReady.call(Core,shot,source);
  if(owner)syncFinalization(owner);
  return result;
};
Core.setPromptResult=function(data,shot,payload={}){
  if(!shot)return originals.setPromptResult.call(Core,data,shot,payload);
  trackOwners(data);
  const synced=canonicalize(data,shot,payload?.assetRefs);
  const result=originals.setPromptResult.call(Core,data,shot,{...payload,assetRefs:synced.refs});
  syncFinalization(synced.data||data);
  return result;
};
Core.shotPromptSourceSnapshot=function(data,shot,assetRefs){
  if(!shot)return originals.shotPromptSourceSnapshot.call(Core,data,shot,assetRefs);
  trackOwners(data);
  const synced=canonicalize(data,shot,assetRefs);
  return originals.shotPromptSourceSnapshot.call(Core,synced.data||data,shot,synced.refs);
};
Core.isPromptSourceCurrent=function(data,shot,assetRefs){
  if(!shot)return originals.isPromptSourceCurrent.call(Core,data,shot,assetRefs);
  trackOwners(data);
  const synced=canonicalize(data,shot,assetRefs);
  return originals.isPromptSourceCurrent.call(Core,synced.data||data,shot,synced.refs);
};
Core.invalidateShotsForAsset=function(data,assetId,reason){
  trackOwners(data);
  if(data&&assetId){
    for(const shot of arr(data.shots)){
      const refs=effectiveAssetRefs(data,shot);
      if(refs.some(id=>String(id)===String(assetId)))shot.assetRefs=refs;
    }
  }
  const result=originals.invalidateShotsForAsset.call(Core,data,assetId,reason);
  if(result)syncFinalization(data);
  return result;
};

globalThis.FuietPromptAssetSourceV1=Object.freeze({version:2,effectiveAssetRefs,promptsReady,syncFinalization});
})();
