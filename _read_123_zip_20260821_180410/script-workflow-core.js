/* Fuiet Script Workflow V1 · shared data contract */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FuietScriptWorkflowCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SCHEMA_VERSION=1;
  const arr=v=>Array.isArray(v)?v:[];
  const text=v=>String(v??'');
  const uniq=v=>[...new Set(arr(v).filter(Boolean))];
  const now=()=>new Date().toISOString();
  const makeId=(factory,prefix)=>typeof factory==='function'?factory(prefix):`${prefix}_${Math.random().toString(36).slice(2,10)}`;
  function normalizeGlobalStyle(data){
    const old=text(data?.style),src=data?.globalStyle&&typeof data.globalStyle==='object'?data.globalStyle:{};
    const out={text:text(src.text||old),referenceNodeIds:uniq(src.referenceNodeIds),referenceMediaUrls:uniq(src.referenceMediaUrls),revision:Math.max(0,Number(src.revision||0)),updatedAt:text(src.updatedAt)};
    data.globalStyle=out;data.style=out.text;return out;
  }
  function normalizeAsset(asset,type,idFactory){
    const a=asset&&typeof asset==='object'?asset:{};
    a.id=a.id||makeId(idFactory,type==='character'?'char':type==='scene'?'scene':'prop');
    a.type=type;a.name=text(a.name||a.title||'');a.description=text(a.description);a.prompt=text(a.prompt||a.description);a.mediaUrl=text(a.mediaUrl||a.referenceUrl);a.nodeIds=uniq(a.nodeIds);a.versions=arr(a.versions);a.revision=Math.max(0,Number(a.revision||0));a.updatedAt=text(a.updatedAt);return a;
  }
  function emptyOutputs(v={}){return{imageNodeIds:uniq(v.imageNodeIds),videoNodeIds:uniq(v.videoNodeIds),selectedImageNodeId:text(v.selectedImageNodeId),selectedVideoNodeId:text(v.selectedVideoNodeId)}}
  function normalizeShot(shot,index,idFactory){
    const s=shot&&typeof shot==='object'?shot:{};
    s.id=s.id||makeId(idFactory,'shot');s.no=Math.max(1,Number(s.no||index+1));s.color=text(s.color||'#55616b');
    s.scene=text(s.scene);s.characters=Array.isArray(s.characters)?s.characters.join('、'):text(s.characters);s.props=Array.isArray(s.props)?s.props.join('、'):text(s.props);s.shotSize=text(s.shotSize||s.shot_size||'中景');
    s.lighting=text(s.lighting||s.light||s.atmosphere);s.action=text(s.action||s.visual||s.description);s.dialogue=text(s.dialogue||s.voice);s.sound=text(s.sound||s.sfx);s.cameraMovement=text(s.cameraMovement||s.camera_movement||s.camera||s.motion);
    s.duration=Math.max(.5,Number(s.duration||3));s.assetRefs=uniq(s.assetRefs);s.baseImagePrompt=text(s.baseImagePrompt||s.imagePrompt||s.image_prompt);s.baseVideoPrompt=text(s.baseVideoPrompt||s.videoPrompt||s.video_prompt);s.imagePrompt=text(s.imagePrompt||s.image_prompt);s.videoPrompt=text(s.videoPrompt||s.video_prompt);
    s.promptDirty=Boolean(s.promptDirty);s.dirtyReason=text(s.dirtyReason);s.promptRevision=Math.max(0,Number(s.promptRevision||0));s.promptStatus=s.promptDirty?'dirty':text(s.promptStatus||(s.imagePrompt||s.videoPrompt?'ready':'empty'));s.outputs=emptyOutputs(s.outputs);return s;
  }
  function createScriptData(){return{schemaVersion:SCHEMA_VERSION,style:'',globalStyle:{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''},assets:{characters:[],scenes:[],props:[]},shots:[],workflow:{stage:'draft',shotsConfirmed:false,assetsReady:false,promptsReady:false,updatedAt:''},production:{image:{},video:{}},quality:{shots:{},baseline:null},finalized:false}}
  function normalizeScriptData(input,opts={}){
    const d=input&&typeof input==='object'?input:createScriptData();d.schemaVersion=SCHEMA_VERSION;normalizeGlobalStyle(d);d.assets=d.assets&&typeof d.assets==='object'?d.assets:{};
    d.assets.characters=arr(d.assets.characters).map(a=>normalizeAsset(a,'character',opts.idFactory));d.assets.scenes=arr(d.assets.scenes).map(a=>normalizeAsset(a,'scene',opts.idFactory));d.assets.props=arr(d.assets.props).map(a=>normalizeAsset(a,'prop',opts.idFactory));d.shots=arr(d.shots).map((s,i)=>normalizeShot(s,i,opts.idFactory));d.shots.forEach((s,i)=>s.no=i+1);
    d.workflow=d.workflow&&typeof d.workflow==='object'?d.workflow:{};d.workflow.stage=text(d.workflow.stage||(d.shots.length?'shots':'draft'));d.workflow.shotsConfirmed=Boolean(d.workflow.shotsConfirmed);d.workflow.assetsReady=Boolean(d.workflow.assetsReady);d.workflow.promptsReady=Boolean(d.workflow.promptsReady);d.workflow.updatedAt=text(d.workflow.updatedAt);d.production=d.production&&typeof d.production==='object'?d.production:{image:{},video:{}};d.production.image=d.production.image||{};d.production.video=d.production.video||{};d.quality=d.quality&&typeof d.quality==='object'?d.quality:{shots:{},baseline:null};d.quality.shots=d.quality.shots||{};if(!('baseline' in d.quality))d.quality.baseline=null;d.finalized=Boolean(d.finalized);return d;
  }
  function markShotDirty(shot,reason='内容已修改'){if(!shot)return shot;shot.promptDirty=true;shot.promptStatus='dirty';shot.dirtyReason=reason;shot.dirtyAt=now();return shot}
  function markShotReady(shot){if(!shot)return shot;shot.promptDirty=false;shot.promptStatus='ready';shot.dirtyReason='';shot.promptRevision=Math.max(0,Number(shot.promptRevision||0))+1;shot.promptUpdatedAt=now();return shot}
  function registerShotOutput(shot,type,nodeId,{select=true}={}){if(!shot||!nodeId)return;shot.outputs=emptyOutputs(shot.outputs);const key=type==='video'?'videoNodeIds':'imageNodeIds',selected=type==='video'?'selectedVideoNodeId':'selectedImageNodeId';shot.outputs[key]=uniq([...shot.outputs[key],nodeId]);if(select||!shot.outputs[selected])shot.outputs[selected]=nodeId}
  function createGenerationSnapshot({scriptNodeId='',shot,type='image',prompt='',globalStyle={},assets=[],providerId='',modelId='',parameters={}}={}){return{schemaVersion:SCHEMA_VERSION,createdAt:now(),scriptNodeId:text(scriptNodeId),shotId:text(shot?.id),shotNo:Number(shot?.no||0),type:type==='video'?'video':'image',prompt:text(prompt),globalStyle:{text:text(globalStyle?.text),revision:Math.max(0,Number(globalStyle?.revision||0))},assets:arr(assets).map(a=>({id:text(a.id),type:text(a.type||a.assetType),name:text(a.name),revision:Math.max(0,Number(a.revision||0)),mediaUrl:text(a.mediaUrl),prompt:text(a.prompt)})),providerId:text(providerId),modelId:text(modelId),parameters:JSON.parse(JSON.stringify(parameters||{}))}}
  function globalStyleText(data){return text(data?.globalStyle?.text||data?.style)}
  return{SCHEMA_VERSION,createScriptData,normalizeScriptData,normalizeGlobalStyle,normalizeAsset,normalizeShot,markShotDirty,markShotReady,registerShotOutput,createGenerationSnapshot,globalStyleText};
});
