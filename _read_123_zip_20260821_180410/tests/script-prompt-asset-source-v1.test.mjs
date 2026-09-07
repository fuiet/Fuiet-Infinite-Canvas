import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const patch=fs.readFileSync(new URL('../script-prompt-asset-source-v1.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

function runtimeFor(data){
  const Core={
    markShotReady(shot,source){shot.promptSource=source||null;shot.promptStatus='ready';return shot},
    setPromptResult(data,shot,payload={}){shot.imagePrompt=payload.imagePrompt||shot.imagePrompt;shot.videoPrompt=payload.videoPrompt||shot.videoPrompt;shot.promptSource=this.shotPromptSourceSnapshot(data,shot,payload.assetRefs);return shot},
    shotPromptSourceSnapshot(data,shot,refs=[]){return{assetRevisions:Object.fromEntries(refs.map(id=>[id,(data.assets.characters||[]).concat(data.assets.scenes||[],data.assets.props||[]).find(a=>String(a.id)===String(id))?.revision||0])),fingerprint:JSON.stringify(refs)}},
    isPromptSourceCurrent(data,shot,refs=[]){return{refs:[...refs],source:shot.promptSource}},
    invalidateShotsForAsset(data,assetId){return(data.shots||[]).filter(shot=>(shot.assetRefs||[]).some(id=>String(id)===String(assetId))).length}
  };
  const root={
    FuietScriptWorkflowCore:Core,
    CanvasBrowserStorageManager:{getItem:key=>key==='libtv-clone-state'?JSON.stringify({nodes:[{type:'script',scriptData:data}]}):null}
  };
  vm.runInNewContext(patch,{globalThis:root});
  return{Core:root.FuietScriptWorkflowCore,api:root.FuietPromptAssetSourceV1};
}

function fixture(){
  const shot={id:'shot-1',characters:'小林',scene:'客厅',props:'红色钥匙',action:'小林在客厅拿起红色钥匙',dialogue:'',assetRefs:['char-1']};
  const data={
    globalStyle:{revision:3},
    assets:{
      characters:[{id:'char-1',name:'小林',revision:2}],
      scenes:[{id:'scene-1',name:'客厅',revision:4}],
      props:[{id:'prop-1',name:'红色钥匙',revision:5}]
    },
    shots:[shot]
  };
  return{data,shot};
}

test('markShotReady canonicalizes all actually matched assets before source snapshot',()=>{
  const {data,shot}=fixture(),{Core}=runtimeFor(data);
  Core.markShotReady(shot);
  assert.deepEqual([...shot.assetRefs].sort(),['char-1','prop-1','scene-1']);
  assert.deepEqual(Object.keys(shot.promptSource.assetRevisions).sort(),['char-1','prop-1','scene-1']);
});

test('prompt result and asset invalidation share the same effective asset refs',()=>{
  const {data,shot}=fixture();shot.assetRefs=[];
  const {Core}=runtimeFor(data);
  Core.setPromptResult(data,shot,{imagePrompt:'frame',videoPrompt:'motion'});
  assert.deepEqual([...shot.assetRefs].sort(),['char-1','prop-1','scene-1']);
  shot.assetRefs=[];
  assert.equal(Core.invalidateShotsForAsset(data,'prop-1','道具已修改'),1);
  assert.ok(shot.assetRefs.includes('prop-1'));
});

test('browser loads the asset source guard after app state exists and before final prompt modules',()=>{
  const appIndex=bootstrap.indexOf('./app.js');
  const guardIndex=bootstrap.indexOf('./script-prompt-asset-source-v1.js');
  const finalIndex=bootstrap.indexOf('./script-final-prompt-v2.js');
  assert.ok(appIndex>=0&&guardIndex>appIndex&&finalIndex>guardIndex);
  assert.match(bootstrap,/20260907-final-prompt-asset-source-4/);
});
