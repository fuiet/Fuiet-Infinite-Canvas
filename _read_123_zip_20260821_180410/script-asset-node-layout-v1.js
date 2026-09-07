/* Fuiet Infinite Canvas · script asset canvas layout
 * Script-created asset nodes must be readable production artifacts, not overlapping cards.
 * New nodes are placed on a collision-aware grid to the right of their script node.
 * Legacy script asset nodes are repaired once; user movement after repair is preserved.
 */
(()=>{
'use strict';
const OPS=new Set(['script_asset','script_asset_reference']);
const TYPE_ORDER={characters:0,character:0,scenes:1,scene:1,props:2,prop:2};
const GRID=Object.freeze({columns:3,nodeWidth:320,nodeHeight:300,gapX:72,gapY:72,offsetX:520,padding:24,version:1});
const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
function isScriptAssetNode(node,scriptNodeId=''){
  if(!node||node.type!=='image'||!OPS.has(String(node.toolParams?.operation||'')))return false;
  return !scriptNodeId||String(node.toolParams?.scriptNodeId||'')===String(scriptNodeId);
}
function nodeRect(node,w=GRID.nodeWidth,h=GRID.nodeHeight){return{x:num(node?.x),y:num(node?.y),w:Math.max(1,num(node?.w,w)),h:Math.max(1,num(node?.h,h))}}
function rectsOverlap(a,b,padding=GRID.padding){return a.x<b.x+b.w+padding&&a.x+a.w+padding>b.x&&a.y<b.y+b.h+padding&&a.y+a.h+padding>b.y}
function slotPlacement(scriptNode,index=0){
  const slot=Math.max(0,Math.floor(num(index,0))),col=slot%GRID.columns,row=Math.floor(slot/GRID.columns);
  return{x:num(scriptNode?.x)+GRID.offsetX+col*(GRID.nodeWidth+GRID.gapX),y:num(scriptNode?.y)+row*(GRID.nodeHeight+GRID.gapY),index:slot};
}
function collides(candidate,nodes=[],options={}){
  const rect={x:candidate.x,y:candidate.y,w:num(options.w,GRID.nodeWidth),h:num(options.h,GRID.nodeHeight)};
  return nodes.some(node=>rectsOverlap(rect,nodeRect(node),num(options.padding,GRID.padding)));
}
function nextPlacement(state={},scriptNode,options={}){
  const nodes=Array.isArray(state.nodes)?state.nodes:[],ignore=new Set((options.ignoreNodeIds||[]).map(String));
  const own=nodes.filter(node=>isScriptAssetNode(node,scriptNode?.id)&&!ignore.has(String(node.id)));
  const occupied=nodes.filter(node=>!ignore.has(String(node.id)));
  const requested=Number.isFinite(Number(options.index))?Math.max(0,Math.floor(Number(options.index))):own.length;
  for(let slot=requested;slot<requested+600;slot++){
    const candidate=slotPlacement(scriptNode,slot);
    if(!collides(candidate,occupied,options))return candidate;
  }
  return slotPlacement(scriptNode,requested+600);
}
function catalogOrder(scriptNode){
  const out=new Map(),assets=scriptNode?.scriptData?.assets||{};let index=0;
  for(const key of ['characters','scenes','props'])for(const asset of (Array.isArray(assets[key])?assets[key]:[]))if(asset?.id&&!out.has(String(asset.id)))out.set(String(asset.id),index++);
  return out;
}
function repairState(state={}){
  if(!Array.isArray(state.nodes)||!state.nodes.length)return state;
  const scripts=new Map(state.nodes.filter(node=>node?.type==='script'&&node?.id).map(node=>[String(node.id),node]));
  for(const [scriptId,scriptNode] of scripts){
    const all=state.nodes.filter(node=>isScriptAssetNode(node,scriptId));
    const moving=all.filter(node=>num(node.toolParams?.scriptAssetLayoutVersion,0)<GRID.version);
    if(!moving.length)continue;
    const order=catalogOrder(scriptNode);
    moving.sort((a,b)=>{
      const ai=order.has(String(a.toolParams?.assetId||''))?order.get(String(a.toolParams.assetId)):999999;
      const bi=order.has(String(b.toolParams?.assetId||''))?order.get(String(b.toolParams.assetId)):999999;
      if(ai!==bi)return ai-bi;
      const at=TYPE_ORDER[String(a.toolParams?.assetType||'')]??99,bt=TYPE_ORDER[String(b.toolParams?.assetType||'')]??99;
      return at-bt||num(a.y)-num(b.y)||num(a.x)-num(b.x)||String(a.id).localeCompare(String(b.id));
    });
    const movingIds=new Set(moving.map(node=>String(node.id))),occupied=state.nodes.filter(node=>!movingIds.has(String(node.id)));
    let slot=0;
    for(const node of moving){
      let candidate;
      for(;slot<1000;slot++){
        candidate=slotPlacement(scriptNode,slot);
        if(!collides(candidate,occupied,{w:num(node.w,GRID.nodeWidth),h:num(node.h,GRID.nodeHeight)})){slot++;break}
      }
      node.x=candidate.x;node.y=candidate.y;
      node.toolParams={...(node.toolParams||{}),scriptAssetLayoutVersion:GRID.version};
      occupied.push(node);
    }
  }
  return state;
}
const api=Object.freeze({GRID,isScriptAssetNode,nodeRect,rectsOverlap,slotPlacement,nextPlacement,repairState});
globalThis.FuietScriptAssetNodeLayoutV1=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
