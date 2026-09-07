/* Fuiet Script · Prompt Asset Source V1
 * Keeps the asset set used by final-prompt composition aligned with the stable
 * shot.assetRefs + promptSource revision snapshot used by dirty tracking.
 */
(()=>{
'use strict';
const Core=globalThis.FuietScriptWorkflowCore;
const manager=globalThis.CanvasBrowserStorageManager;
if(!Core||globalThis.FuietPromptAssetSourceV1)return;

const text=v=>String(v??'');
const arr=v=>Array.isArray(v)?v:[];
const originals={
  markShotReady:Core.markShotReady,
  setPromptResult:Core.setPromptResult,
  shotPromptSourceSnapshot:Core.shotPromptSourceSnapshot,
  isPromptSourceCurrent:Core.isPromptSourceCurrent,
  invalidateShotsForAsset:Core.invalidateShotsForAsset
};
if(Object.values(originals).some(fn=>typeof fn!=='function'))return;

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
function dataFor(shot,data){return data||storedDataForShot(shot)}
function canonicalize(data,shot,providedRefs){
  const resolved=dataFor(shot,data);if(!resolved||!shot)return{data:resolved,refs:arr(providedRefs??shot?.assetRefs)};
  const refs=effectiveAssetRefs(resolved,shot,providedRefs);shot.assetRefs=refs;return{data:resolved,refs};
}

Core.markShotReady=function(shot,source){
  if(!shot||source)return originals.markShotReady.call(Core,shot,source);
  const synced=canonicalize(null,shot);
  if(!synced.data)return originals.markShotReady.call(Core,shot,source);
  const snapshot=originals.shotPromptSourceSnapshot.call(Core,synced.data,shot,synced.refs);
  return originals.markShotReady.call(Core,shot,snapshot);
};
Core.setPromptResult=function(data,shot,payload={}){
  if(!shot)return originals.setPromptResult.call(Core,data,shot,payload);
  const synced=canonicalize(data,shot,payload?.assetRefs);
  return originals.setPromptResult.call(Core,data,shot,{...payload,assetRefs:synced.refs});
};
Core.shotPromptSourceSnapshot=function(data,shot,assetRefs){
  if(!shot)return originals.shotPromptSourceSnapshot.call(Core,data,shot,assetRefs);
  const synced=canonicalize(data,shot,assetRefs);
  return originals.shotPromptSourceSnapshot.call(Core,synced.data||data,shot,synced.refs);
};
Core.isPromptSourceCurrent=function(data,shot,assetRefs){
  if(!shot)return originals.isPromptSourceCurrent.call(Core,data,shot,assetRefs);
  const synced=canonicalize(data,shot,assetRefs);
  return originals.isPromptSourceCurrent.call(Core,synced.data||data,shot,synced.refs);
};
Core.invalidateShotsForAsset=function(data,assetId,reason){
  if(data&&assetId){
    for(const shot of arr(data.shots)){
      const refs=effectiveAssetRefs(data,shot);
      if(refs.some(id=>String(id)===String(assetId)))shot.assetRefs=refs;
    }
  }
  return originals.invalidateShotsForAsset.call(Core,data,assetId,reason);
};

globalThis.FuietPromptAssetSourceV1=Object.freeze({version:1,effectiveAssetRefs});
})();
