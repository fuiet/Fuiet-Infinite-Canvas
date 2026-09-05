/* Fuiet Script Workflow V2 · shared data contract */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FuietScriptWorkflowCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SCHEMA_VERSION=2;
  const arr=v=>Array.isArray(v)?v:[];
  const text=v=>String(v??'');
  const uniq=v=>[...new Set(arr(v).filter(Boolean))];
  const now=()=>new Date().toISOString();
  const makeId=(factory,prefix)=>typeof factory==='function'?factory(prefix):`${prefix}_${Math.random().toString(36).slice(2,10)}`;
  const nonNegative=v=>Math.max(0,Number(v||0));

  function normalizeGlobalStyle(data){
    const old=text(data?.style),src=data?.globalStyle&&typeof data.globalStyle==='object'?data.globalStyle:{};
    const out={
      text:text(src.text||old),
      referenceNodeIds:uniq(src.referenceNodeIds),
      referenceMediaUrls:uniq(src.referenceMediaUrls),
      revision:nonNegative(src.revision),
      updatedAt:text(src.updatedAt)
    };
    data.globalStyle=out;data.style=out.text;return out;
  }

  function normalizeAsset(asset,type,idFactory){
    const a=asset&&typeof asset==='object'?asset:{};
    a.id=a.id||makeId(idFactory,type==='character'?'char':type==='scene'?'scene':'prop');
    a.type=type;
    a.name=text(a.name||a.title||'');
    a.description=text(a.description);
    a.prompt=text(a.prompt||a.description);
    a.mediaUrl=text(a.mediaUrl||a.referenceUrl);
    a.nodeIds=uniq(a.nodeIds);
    a.versions=arr(a.versions);
    a.revision=nonNegative(a.revision);
    a.updatedAt=text(a.updatedAt);
    return a;
  }

  function emptyOutputs(v={}){
    return{
      imageNodeIds:uniq(v.imageNodeIds),
      videoNodeIds:uniq(v.videoNodeIds),
      selectedImageNodeId:text(v.selectedImageNodeId),
      selectedVideoNodeId:text(v.selectedVideoNodeId)
    };
  }

  function normalizePromptSource(v={}){
    const src=v&&typeof v==='object'?v:{};
    const assetRevisions={};
    Object.entries(src.assetRevisions&&typeof src.assetRevisions==='object'?src.assetRevisions:{}).forEach(([id,rev])=>{
      if(id)assetRevisions[id]=nonNegative(rev);
    });
    return{
      shotRevision:nonNegative(src.shotRevision),
      styleRevision:nonNegative(src.styleRevision),
      assetRevisions,
      fingerprint:text(src.fingerprint)
    };
  }

  function normalizeShot(shot,index,idFactory){
    const s=shot&&typeof shot==='object'?shot:{};
    s.id=s.id||makeId(idFactory,'shot');
    s.no=Math.max(1,Number(s.no||index+1));
    s.color=text(s.color||'#55616b');
    s.scene=text(s.scene);
    s.characters=Array.isArray(s.characters)?s.characters.join('、'):text(s.characters);
    s.props=Array.isArray(s.props)?s.props.join('、'):text(s.props);
    s.shotSize=text(s.shotSize||s.shot_size||'中景');
    s.lighting=text(s.lighting||s.light||s.atmosphere);
    s.action=text(s.action||s.visual||s.description);
    s.dialogue=text(s.dialogue||s.voice);
    s.sound=text(s.sound||s.sfx);
    s.cameraMovement=text(s.cameraMovement||s.camera_movement||s.camera||s.motion);
    s.duration=Math.max(.5,Number(s.duration||3));
    s.assetRefs=uniq(s.assetRefs);
    s.baseImagePrompt=text(s.baseImagePrompt||s.imagePrompt||s.image_prompt);
    s.baseVideoPrompt=text(s.baseVideoPrompt||s.videoPrompt||s.video_prompt);
    s.imagePrompt=text(s.imagePrompt||s.image_prompt);
    s.videoPrompt=text(s.videoPrompt||s.video_prompt);
    s.shotRevision=nonNegative(s.shotRevision||s.contentRevision);
    s.promptRevision=nonNegative(s.promptRevision);
    s.promptSource=normalizePromptSource(s.promptSource||s.sourceVersion);
    s.promptGeneratedAt=text(s.promptGeneratedAt||s.generatedAt||s.promptUpdatedAt);
    s.promptUpdatedAt=text(s.promptUpdatedAt||s.promptGeneratedAt);
    s.promptError=text(s.promptError);
    s.dirtyReason=text(s.dirtyReason);
    s.promptDirty=Boolean(s.promptDirty);
    const inferred=(s.imagePrompt||s.videoPrompt)?'ready':'pending';
    const status=text(s.promptStatus||inferred);
    s.promptStatus=s.promptDirty?'dirty':(['pending','generating','ready','dirty','error'].includes(status)?status:inferred);
    s.outputs=emptyOutputs(s.outputs);
    return s;
  }

  function createScriptData(){
    return{
      schemaVersion:SCHEMA_VERSION,
      style:'',
      globalStyle:{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''},
      assets:{characters:[],scenes:[],props:[]},
      shots:[],
      workflow:{stage:'draft',shotsConfirmed:false,assetsReady:false,promptsReady:false,updatedAt:''},
      production:{image:{},video:{}},
      quality:{shots:{},baseline:null},
      finalized:false
    };
  }

  function normalizeScriptData(input,opts={}){
    const d=input&&typeof input==='object'?input:createScriptData();
    d.schemaVersion=SCHEMA_VERSION;
    normalizeGlobalStyle(d);
    d.assets=d.assets&&typeof d.assets==='object'?d.assets:{};
    d.assets.characters=arr(d.assets.characters).map(a=>normalizeAsset(a,'character',opts.idFactory));
    d.assets.scenes=arr(d.assets.scenes).map(a=>normalizeAsset(a,'scene',opts.idFactory));
    d.assets.props=arr(d.assets.props).map(a=>normalizeAsset(a,'prop',opts.idFactory));
    d.shots=arr(d.shots).map((s,i)=>normalizeShot(s,i,opts.idFactory));
    d.shots.forEach((s,i)=>s.no=i+1);
    d.workflow=d.workflow&&typeof d.workflow==='object'?d.workflow:{};
    d.workflow.stage=text(d.workflow.stage||(d.shots.length?'shots':'draft'));
    d.workflow.shotsConfirmed=Boolean(d.workflow.shotsConfirmed);
    d.workflow.assetsReady=Boolean(d.workflow.assetsReady);
    d.workflow.promptsReady=Boolean(d.workflow.promptsReady);
    d.workflow.updatedAt=text(d.workflow.updatedAt);
    d.production=d.production&&typeof d.production==='object'?d.production:{image:{},video:{}};
    d.production.image=d.production.image||{};
    d.production.video=d.production.video||{};
    d.quality=d.quality&&typeof d.quality==='object'?d.quality:{shots:{},baseline:null};
    d.quality.shots=d.quality.shots||{};
    if(!('baseline' in d.quality))d.quality.baseline=null;
    d.finalized=Boolean(d.finalized);
    return d;
  }

  function assetCatalog(data){
    return[
      ...arr(data?.assets?.characters),
      ...arr(data?.assets?.scenes),
      ...arr(data?.assets?.props)
    ];
  }

  function promptSourceFingerprint(source={}){
    const src=normalizePromptSource(source);
    const assets=Object.entries(src.assetRevisions).sort(([a],[b])=>a.localeCompare(b));
    return JSON.stringify({shotRevision:src.shotRevision,styleRevision:src.styleRevision,assetRevisions:assets});
  }

  function shotPromptSourceSnapshot(data,shot,assetRefs){
    const ids=uniq(assetRefs||shot?.assetRefs);
    const byId=new Map(assetCatalog(data).map(a=>[a.id,a]));
    const assetRevisions={};
    ids.forEach(id=>{assetRevisions[id]=nonNegative(byId.get(id)?.revision)});
    const source={
      shotRevision:nonNegative(shot?.shotRevision),
      styleRevision:nonNegative(data?.globalStyle?.revision),
      assetRevisions
    };
    source.fingerprint=promptSourceFingerprint(source);
    return source;
  }

  function isPromptSourceCurrent(data,shot,assetRefs){
    if(!shot||shot.promptDirty||shot.promptStatus==='dirty'||shot.promptStatus==='error')return false;
    if(!text(shot.imagePrompt).trim()||!text(shot.videoPrompt).trim())return false;
    const current=shotPromptSourceSnapshot(data,shot,assetRefs);
    const stored=normalizePromptSource(shot.promptSource);
    return Boolean(stored.fingerprint)&&stored.fingerprint===current.fingerprint;
  }

  function markShotDirty(shot,reason='内容已修改'){
    if(!shot)return shot;
    shot.promptDirty=true;
    shot.promptStatus='dirty';
    shot.dirtyReason=reason;
    shot.dirtyAt=now();
    shot.promptError='';
    return shot;
  }

  function touchShot(shot,reason='镜头信息已修改'){
    if(!shot)return shot;
    shot.shotRevision=nonNegative(shot.shotRevision)+1;
    shot.updatedAt=now();
    return markShotDirty(shot,reason);
  }

  function touchAsset(asset){
    if(!asset)return asset;
    asset.revision=nonNegative(asset.revision)+1;
    asset.updatedAt=now();
    return asset;
  }

  function touchGlobalStyle(data){
    if(!data)return null;
    const style=normalizeGlobalStyle(data);
    style.revision=nonNegative(style.revision)+1;
    style.updatedAt=now();
    data.style=style.text;
    return style;
  }

  function markShotGenerating(shot){
    if(!shot)return shot;
    shot.promptStatus='generating';
    shot.promptDirty=false;
    shot.dirtyReason='';
    shot.promptError='';
    shot.promptStartedAt=now();
    return shot;
  }

  function markShotError(shot,error='提示词合成失败'){
    if(!shot)return shot;
    shot.promptStatus='error';
    shot.promptDirty=true;
    shot.promptError=text(error);
    shot.dirtyReason='合成失败';
    shot.promptFailedAt=now();
    return shot;
  }

  function markShotReady(shot,source){
    if(!shot)return shot;
    shot.promptDirty=false;
    shot.promptStatus='ready';
    shot.dirtyReason='';
    shot.promptError='';
    shot.promptRevision=nonNegative(shot.promptRevision)+1;
    shot.promptGeneratedAt=now();
    shot.promptUpdatedAt=shot.promptGeneratedAt;
    if(source)shot.promptSource=normalizePromptSource(source);
    return shot;
  }

  function setPromptResult(data,shot,{imagePrompt='',videoPrompt='',assetRefs}={}){
    if(!shot)return shot;
    if(text(imagePrompt).trim())shot.imagePrompt=text(imagePrompt).trim();
    if(text(videoPrompt).trim())shot.videoPrompt=text(videoPrompt).trim();
    const source=shotPromptSourceSnapshot(data,shot,assetRefs);
    shot.promptSource=source;
    return markShotReady(shot,source);
  }

  function invalidateShotsForAsset(data,assetId,reason='关联资产已修改'){
    if(!data||!assetId)return 0;
    let count=0;
    arr(data.shots).forEach(shot=>{
      if(arr(shot.assetRefs).includes(assetId)){
        markShotDirty(shot,reason);count++;
      }
    });
    if(count&&data.workflow){data.workflow.promptsReady=false;data.workflow.stage='prompts';data.workflow.updatedAt=now()}
    if(count)data.finalized=false;
    return count;
  }

  function invalidateShotsForStyle(data,reason='全局风格已修改'){
    if(!data)return 0;
    let count=0;
    arr(data.shots).forEach(shot=>{markShotDirty(shot,reason);count++});
    if(data.workflow){data.workflow.promptsReady=false;data.workflow.stage='prompts';data.workflow.updatedAt=now()}
    data.finalized=false;
    return count;
  }

  function promptStats(data){
    const shots=arr(data?.shots);
    const stats={total:shots.length,pending:0,generating:0,ready:0,dirty:0,error:0};
    shots.forEach(shot=>{
      const status=shot.promptDirty?'dirty':text(shot.promptStatus||'pending');
      if(status in stats)stats[status]++;else stats.pending++;
    });
    stats.complete=stats.ready===stats.total&&stats.total>0;
    return stats;
  }

  function registerShotOutput(shot,type,nodeId,{select=true}={}){
    if(!shot||!nodeId)return;
    shot.outputs=emptyOutputs(shot.outputs);
    const key=type==='video'?'videoNodeIds':'imageNodeIds',selected=type==='video'?'selectedVideoNodeId':'selectedImageNodeId';
    shot.outputs[key]=uniq([...shot.outputs[key],nodeId]);
    if(select||!shot.outputs[selected])shot.outputs[selected]=nodeId;
  }

  function createGenerationSnapshot({scriptNodeId='',shot,type='image',prompt='',globalStyle={},assets=[],providerId='',modelId='',parameters={}}={}){
    return{
      schemaVersion:SCHEMA_VERSION,
      createdAt:now(),
      scriptNodeId:text(scriptNodeId),
      shotId:text(shot?.id),
      shotNo:Number(shot?.no||0),
      type:type==='video'?'video':'image',
      prompt:text(prompt),
      promptRevision:nonNegative(shot?.promptRevision),
      promptGeneratedAt:text(shot?.promptGeneratedAt),
      promptSource:normalizePromptSource(shot?.promptSource),
      globalStyle:{text:text(globalStyle?.text),revision:nonNegative(globalStyle?.revision)},
      assets:arr(assets).map(a=>({id:text(a.id),type:text(a.type||a.assetType),name:text(a.name),revision:nonNegative(a.revision),mediaUrl:text(a.mediaUrl),prompt:text(a.prompt)})),
      providerId:text(providerId),
      modelId:text(modelId),
      parameters:JSON.parse(JSON.stringify(parameters||{}))
    };
  }

  function globalStyleText(data){return text(data?.globalStyle?.text||data?.style)}

  return{
    SCHEMA_VERSION,
    createScriptData,
    normalizeScriptData,
    normalizeGlobalStyle,
    normalizeAsset,
    normalizeShot,
    normalizePromptSource,
    markShotDirty,
    touchShot,
    touchAsset,
    touchGlobalStyle,
    markShotGenerating,
    markShotError,
    markShotReady,
    setPromptResult,
    shotPromptSourceSnapshot,
    promptSourceFingerprint,
    isPromptSourceCurrent,
    invalidateShotsForAsset,
    invalidateShotsForStyle,
    promptStats,
    registerShotOutput,
    createGenerationSnapshot,
    globalStyleText
  };
});
