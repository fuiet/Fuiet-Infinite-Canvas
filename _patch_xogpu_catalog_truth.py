from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')

adapter=ROOT/'provider-adapter-contract.js'
s=adapter.read_text(encoding='utf-8')
old="""  if(isXogpuProvider(next)){
    if(!String(next.authHeader||'').trim())next.authHeader='Authorization';
    if(!String(next.authScheme||'').trim())next.authScheme='Bearer';
    for(const known of xogpuKnownModels()){
      const current=models.find(model=>String(model?.id||'').toLowerCase()===known.id.toLowerCase());
      models=models.filter(model=>String(model?.id||'').toLowerCase()!==known.id.toLowerCase());
      models.push(current?{...current,...known,id:known.id,name:current.name||known.name,enabled:current.enabled!==false,pricing:current.pricing||known.pricing}:known);
    }
  }
"""
new="""  if(isXogpuProvider(next)){
    if(!String(next.authHeader||'').trim())next.authHeader='Authorization';
    if(!String(next.authScheme||'').trim())next.authScheme='Bearer';
    const knownById=new Map(xogpuKnownModels().map(model=>[String(model.id||'').toLowerCase(),model]));
    models=models.filter(model=>{
      const id=String(model?.id||'').toLowerCase(),known=knownById.get(id);
      if(!known)return true;
      const source=String(model?.modalitySource||'').trim().toLowerCase();
      const staleInjected=!source&&String(model?.videoProtocolFamily||'')==='xogpu-minimax-h3'&&String(model?.capabilities?.billingGroup||'')==='discount_video_generation';
      return !staleInjected;
    }).map(model=>{
      const known=knownById.get(String(model?.id||'').toLowerCase());if(!known)return model;
      return{...model,...known,id:known.id,name:model.name||known.name,enabled:model.enabled!==false,pricing:model.pricing||known.pricing,modalitySource:model.modalitySource||'user'};
    });
  }
"""
if old not in s:
    raise SystemExit('XOGPU unconditional injection block not found')
adapter.write_text(s.replace(old,new,1),encoding='utf-8')

# Browser discovery must remain authoritative for XOGPU. It already replaces provider.models
# with the actual /v1/models response before finalizeProvider; this assertion protects that contract.
browser=ROOT/'browser-runtime.js'
b=browser.read_text(encoding='utf-8')
needle="const merged={...provider,protocol:resolvedProtocol,models};"
if needle not in b:
    raise SystemExit('browser discovery authoritative models merge not found')

# Replace the XOGPU regression file with catalog-truth expectations.
test=ROOT/'tests'/'xogpu-minimax-h3.test.mjs'
t=test.read_text(encoding='utf-8')
old_test="""test('XOGPU provider injects the fixed MiniMax-H3 video model and Bearer auth defaults',()=>{
  const p=A.finalizeProvider(provider),m=p.models.find(x=>x.id==='MiniMax-H3');
  assert.ok(m);assert.equal(m.modality,'video');assert.equal(m.createPath,'/v1/videos');assert.equal(m.videoProtocolFamily,'xogpu-minimax-h3');
  assert.equal(p.authHeader,'Authorization');assert.equal(p.authScheme,'Bearer');
  assert.deepEqual(m.capabilities.durations,Array.from({length:15},(_,i)=>i+1));
  assert.deepEqual(m.capabilities.resolutions,['768p']);assert.ok(m.capabilities.aspectRatios.includes('adaptive'));
  assert.equal(m.capabilities.maxImages,9);assert.equal(m.capabilities.maxVideos,3);assert.equal(m.capabilities.maxAudios,3);assert.equal(m.capabilities.maxReferences,12);
});

test('XOGPU MiniMax-H3 uses exact create poll and content endpoints',()=>{
  const model=A.finalizeProvider(provider).models.find(x=>x.id==='MiniMax-H3'),route=V.resolve(provider,model,'text-to-video');
"""
new_test="""test('XOGPU provider does not invent MiniMax-H3 when the real catalog omits it',()=>{
  const p=A.finalizeProvider(provider);
  assert.equal(p.models.some(x=>x.id==='MiniMax-H3'),false);
  assert.equal(p.authHeader,'Authorization');assert.equal(p.authScheme,'Bearer');
});

test('XOGPU provider decorates MiniMax-H3 only when it is present in the real or user model list',()=>{
  const catalogProvider={...provider,models:[{id:'MiniMax-H3',name:'MiniMax H3',modality:'video',modalitySource:'provider',enabled:true}]};
  const p=A.finalizeProvider(catalogProvider),m=p.models.find(x=>x.id==='MiniMax-H3');
  assert.ok(m);assert.equal(m.modality,'video');assert.equal(m.createPath,'/v1/videos');assert.equal(m.videoProtocolFamily,'xogpu-minimax-h3');
  assert.deepEqual(m.capabilities.durations,Array.from({length:15},(_,i)=>i+1));
  assert.deepEqual(m.capabilities.resolutions,['768p']);assert.ok(m.capabilities.aspectRatios.includes('adaptive'));
  assert.equal(m.capabilities.maxImages,9);assert.equal(m.capabilities.maxVideos,3);assert.equal(m.capabilities.maxAudios,3);assert.equal(m.capabilities.maxReferences,12);
});

test('XOGPU stale auto-injected H3 is removed until catalog discovery confirms it',()=>{
  const stale={...provider,models:[{id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3',capabilities:{billingGroup:'discount_video_generation'}}]};
  assert.equal(A.finalizeProvider(stale).models.some(x=>x.id==='MiniMax-H3'),false);
});

test('XOGPU MiniMax-H3 uses exact create poll and content endpoints',()=>{
  const model=A.finalizeProvider({...provider,models:[{id:'MiniMax-H3',name:'MiniMax H3',modality:'video',modalitySource:'provider'}]}).models.find(x=>x.id==='MiniMax-H3'),route=V.resolve(provider,model,'text-to-video');
"""
if old_test not in t:
    raise SystemExit('XOGPU injection regression block not found')
test.write_text(t.replace(old_test,new_test,1),encoding='utf-8')

print('XOGPU catalog-truth patch applied')
