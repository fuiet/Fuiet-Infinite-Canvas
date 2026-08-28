(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let providers=[], draftProviders=[], activeProvider='all', activeType='all', query='', enabledOnly=false, dirty=false, autoSaveTimer=null, saving=false;
  const PROVIDERS_STORAGE_KEY='canvas-studio-providers-v1';
  const labels={text:'文本',image:'图片',video:'视频',audio:'音频'};
  const adapterLabels={auto:'自动适配','openai-chat':'OpenAI 对话','openai-responses':'OpenAI 响应','openai-image':'OpenAI 图像','openai-audio-speech':'OpenAI 语音','generic-sync':'通用同步接口','generic-async':'通用异步任务','standard-video-async-v1':'标准异步视频协议 v1','comfyui-workflow':'ComfyUI 工作流'};
  function providerHasApiKey(p){return Boolean(String(p?.apiKey||p?.apiKeyEncrypted||'').trim())||p?.hasApiKey===true}
  function resolvedAdapter(p,m){
    const r=m.adapterResolved||{};if(r.key)return r;
    const Contract=globalThis.CanvasProviderAdapters;
    if(Contract?.resolveRoute){
      try{
        const route=Contract.resolveRoute(p,m,m.modality||'text','generate');
        const k=route.adapterKey||Contract.inferAdapterKey?.(p,m)||'auto';
        const ready=Boolean(m.id)&&k!=='auto'&&Boolean(route.createPath);
        return{key:k,label:adapterLabels[k]||'自动适配',ready,createPath:route.createPath||'',responseMode:route.responseMode||''};
      }catch{}
    }
    let k=String(m.adapterKey||'auto');
    if(k==='auto'){
      if(p.protocol==='comfyui')k='comfyui-workflow';
      else if(p.protocol==='openai-compatible')k=m.modality==='text'?'openai-chat':m.modality==='image'?'openai-image':m.modality==='audio'?'openai-audio-speech':m.modality==='video'?'standard-video-async-v1':'auto';
    }
    return{key:k,label:adapterLabels[k]||'自动适配',ready:Boolean(m.id)&&k!=='auto'};
  }

const defaultModel=()=>({id:'',name:'新模型',modality:'text',enabled:true,adapterKey:'auto',operationRoutes:{},createPath:'',method:'POST',responseMode:'sync',outputPath:'',taskIdPath:'',pollPath:'',statusPath:'',progressPath:'',successValues:['completed','succeeded','success'],failureValues:['failed','error','canceled'],pollIntervalMs:1500,timeoutMs:1200000,requestTemplate:{},capabilities:{},pricing:{currency:'USD',perRequest:0,perImage:0,perSecond:0,perMillionInputTokens:0,perMillionOutputTokens:0}});
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const attr=s=>esc(s).replace(/`/g,'&#96;');
  async function api(path,opt={}){const res=await fetch(path,{headers:{'Content-Type':'application/json',...(opt.headers||{})},...opt});let data={};try{data=await res.json()}catch{}if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);return data}
  function sanitizeProvider(provider){const safe=clone(provider||{});delete safe.apiKey;delete safe.apiKeyEncrypted;return safe}
  function loadLocalProviders(){try{const raw=JSON.parse(globalThis.CanvasBrowserStorageManager.getItem(PROVIDERS_STORAGE_KEY));const safe=Array.isArray(raw)?raw.map(sanitizeProvider):[];globalThis.CanvasBrowserStorageManager.setItem(PROVIDERS_STORAGE_KEY,JSON.stringify(safe));return safe}catch{return[]}}
  function saveLocalProviders(list){try{globalThis.CanvasBrowserStorageManager.setItem(PROVIDERS_STORAGE_KEY,JSON.stringify((Array.isArray(list)?list:[]).map(sanitizeProvider)))}catch{}}
  async function restoreProvidersToServer(list){
    if(!Array.isArray(list)||!list.length)return [];
    for(const p of list){
      const payload=clone(p);
      if(!String(payload.apiKey||'').trim())delete payload.apiKey;
      delete payload.hasApiKey;
      await api('/api/providers',{method:'POST',body:JSON.stringify(payload)});
    }
    const fresh=await api('/api/providers');
    const remote=Array.isArray(fresh.providers)?fresh.providers:[];
    if(remote.length)saveLocalProviders(remote);
    return remote;
  }
  function markDirty(){
    dirty=true;
    $('#saveState').textContent='正在自动保存…';
    clearTimeout(autoSaveTimer);
    autoSaveTimer=setTimeout(()=>saveAll(true),450);
  }
  function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(showToast.t);showToast.t=setTimeout(()=>t.classList.add('hidden'),2200)}
  function clone(x){return JSON.parse(JSON.stringify(x))}
  function flattened(){return draftProviders.flatMap(p=>(p.models||[]).map((m,i)=>({p,m,i})))}
  function filtered(){return flattened().filter(({p,m})=>{
    if(activeProvider!=='all'&&p.id!==activeProvider)return false;
    if(activeType!=='all'&&m.modality!==activeType)return false;
    if(enabledOnly&&m.enabled===false)return false;
    if(query){const hay=`${m.name||''} ${m.id||''} ${p.name||''}`.toLowerCase();if(!hay.includes(query))return false}
    return true;
  })}
  function renderSidebar(){const counts=new Map(draftProviders.map(p=>[p.id,(p.models||[]).length]));$('#allProviderCount').textContent=flattened().length;$('#providerFilters').innerHTML=draftProviders.map(p=>`<button class="provider-filter ${activeProvider===p.id?'active':''}" data-provider="${attr(p.id)}"><span>${esc(p.name||'未命名供应商')}</span><b>${counts.get(p.id)||0}</b></button>`).join('');$$('.provider-filter').forEach(b=>b.onclick=()=>{activeProvider=b.dataset.provider;render()})}
  function renderSummary(){const all=flattened();$('#totalCount').textContent=all.length;$('#summaryStrip').innerHTML=['text','image','video','audio'].map(t=>`<span class="summary-chip"><b>${all.filter(x=>x.m.modality===t).length}</b>${labels[t]}</span>`).join('')}
  function field(label,html,cls=''){return `<div class="field ${cls}"><label>${label}</label>${html}</div>`}
  function rowHtml(x,visibleIndex){const {p,m,i}=x;const ad=resolvedAdapter(p,m);return `<article class="model-row ${m.enabled===false?'disabled':''}" data-provider-id="${attr(p.id)}" data-model-index="${i}">
    <div class="model-row-head">
      <span class="model-number">${visibleIndex+1}</span>
      <div class="model-identity"><div class="model-name">${esc(m.name||m.id||'未命名模型')}</div><div class="model-meta">${esc(m.id||'未设置 ID')} · <span class="adapter-status ${ad.ready?'ready':'pending'}">${esc(ad.label||'自动适配')}</span></div></div>
      <div class="model-provider">${esc(p.name||'接口')}</div>
      <select class="type-select" data-field="modality">${['text','image','video','audio'].map(t=>`<option value="${t}" ${m.modality===t?'selected':''}>${labels[t]}</option>`).join('')}</select>
      <div class="adapter-summary"><b>${esc(ad.label||'自动适配')}</b><small>${ad.ready?'已就绪':'需要高级配置'}</small></div>
      <div class="row-actions"><label class="model-enabled"><input data-field="enabled" type="checkbox" ${m.enabled!==false?'checked':''}>启用</label><button class="row-action" data-toggle>设置</button><button class="row-action danger" data-remove>删除</button></div>
    </div>
    <div class="model-row-details"><div class="details-grid basic-model-settings">
      ${field('显示名称',`<input data-field="name" value="${attr(m.name||'')}">`)}
      ${field('模型 ID',`<input data-field="id" value="${attr(m.id||'')}">`)}
      ${field('适配器',`<select data-field="adapterKey">${Object.entries(adapterLabels).map(([k,v])=>`<option value="${k}" ${(m.adapterKey||'auto')===k?'selected':''}>${v}</option>`).join('')}</select><small>默认使用“自动适配”。只有供应商协议特殊时才需要手动指定。</small>`)}
      ${field('能力结构 JSON',`<textarea data-field="capabilities">${esc(JSON.stringify(m.capabilities||{},null,2))}</textarea><small>只在系统自动识别能力不正确时修改。</small>`,'full')}
      ${field('生成价格配置 JSON',`<textarea data-field="pricing">${esc(JSON.stringify(m.pricing||{},null,2))}</textarea><small>用于画布生成前成本预估。支持 currency、perRequest、perImage、perSecond、perMillionInputTokens、perMillionOutputTokens。</small>`,'full')}
    </div>
    <details class="developer-config"><summary>开发者高级设置 <span>普通用户不用填写</span></summary><div class="details-grid developer-grid">
      ${field('响应模式',`<select data-field="responseMode"><option value="sync" ${m.responseMode!=='async'?'selected':''}>同步响应</option><option value="async" ${m.responseMode==='async'?'selected':''}>异步任务</option></select>`)}
      ${field('创建接口',`<input data-field="createPath" value="${attr(m.createPath||'')}" placeholder="自动适配时可留空">`,'wide')}
      ${field('结果字段',`<input data-field="outputPath" value="${attr(m.outputPath||'')}" placeholder="data.0.url / output.url">`,'wide')}
      ${field('任务 ID 字段',`<input data-field="taskIdPath" value="${attr(m.taskIdPath||'')}" placeholder="id">`)}
      ${field('查询接口',`<input data-field="pollPath" value="${attr(m.pollPath||'')}" placeholder="/v1/tasks/{{taskId}}">`,'wide')}
      ${field('状态字段',`<input data-field="statusPath" value="${attr(m.statusPath||'')}" placeholder="status">`)}
      ${field('进度字段',`<input data-field="progressPath" value="${attr(m.progressPath||'')}" placeholder="progress">`)}
      ${field('成功状态',`<input data-field="successValues" value="${attr((m.successValues||[]).join(','))}">`,'wide')}
      ${field('失败状态',`<input data-field="failureValues" value="${attr((m.failureValues||[]).join(','))}">`,'wide')}
      ${field('轮询间隔（毫秒）',`<input type="number" data-field="pollIntervalMs" value="${Number(m.pollIntervalMs||1500)}">`)}
      ${field('超时时间（毫秒）',`<input type="number" data-field="timeoutMs" value="${Number(m.timeoutMs||1200000)}">`)}
      ${field('请求体模板 JSON',`<textarea data-field="requestTemplate">${esc(JSON.stringify(m.requestTemplate||{},null,2))}</textarea><small>可用变量包含 {{model}}、{{prompt}}、{{references}}、{{firstFrameUrl}}、{{lastFrameUrl}}、{{semantic.byRole}} 等。</small>`,'full')}
      ${field('操作路由 JSON',`<textarea data-field="operationRoutes">${esc(JSON.stringify(m.operationRoutes||{},null,2))}</textarea><small>可为 generate / video_extend / video_reshoot / image_edit 等操作单独设置 createPath、pollPath、outputPath。</small>`,'full')}
    </div></details></div>
  </article>`}

  function readRow(row){const pid=row.dataset.providerId, idx=Number(row.dataset.modelIndex),p=draftProviders.find(x=>x.id===pid),m=p?.models?.[idx];if(!m)return;const val=f=>$(`[data-field="${f}"]`,row)?.value??'';m.name=val('name');m.id=val('id').trim();m.modality=val('modality')||m.modality;m.adapterKey=val('adapterKey')||m.adapterKey||'auto';m.responseMode=val('responseMode')||m.responseMode||'sync';m.enabled=$('[data-field="enabled"]',row)?.checked!==false;m.createPath=val('createPath').trim();m.outputPath=val('outputPath').trim();m.taskIdPath=val('taskIdPath').trim();m.pollPath=val('pollPath').trim();m.statusPath=val('statusPath').trim();m.progressPath=val('progressPath').trim();m.successValues=val('successValues').split(',').map(x=>x.trim()).filter(Boolean);m.failureValues=val('failureValues').split(',').map(x=>x.trim()).filter(Boolean);m.pollIntervalMs=Number(val('pollIntervalMs')||1500);m.timeoutMs=Number(val('timeoutMs')||1200000);try{m.capabilities=JSON.parse(val('capabilities')||'{}');delete m.__capInvalid}catch{m.__capInvalid=true}try{m.pricing=JSON.parse(val('pricing')||'{}');delete m.__priceInvalid}catch{m.__priceInvalid=true}try{m.requestTemplate=JSON.parse(val('requestTemplate')||'{}');delete m.__reqInvalid}catch{m.__reqInvalid=true}try{m.operationRoutes=JSON.parse(val('operationRoutes')||'{}');delete m.__opInvalid}catch{m.__opInvalid=true}}

  function syncVisibleRows(){$$('.model-row').forEach(readRow)}
  function bindRows(){$$('.model-row').forEach(row=>{$('[data-toggle]',row).onclick=()=>row.classList.toggle('open');$('[data-remove]',row).onclick=()=>{syncVisibleRows();const p=draftProviders.find(x=>x.id===row.dataset.providerId),idx=Number(row.dataset.modelIndex);if(!p)return;if(!confirm(`删除模型「${p.models[idx]?.name||p.models[idx]?.id||''}」？`))return;p.models.splice(idx,1);markDirty();render()};$$('input,select,textarea',row).forEach(el=>el.addEventListener('change',()=>{readRow(row);markDirty();if(el.dataset.field==='enabled')row.classList.toggle('disabled',!el.checked);if(el.dataset.field==='modality')renderSummary()}));})}
  function renderList(){syncVisibleRows();const items=filtered();$('#modelList').innerHTML=items.length?items.map(rowHtml).join(''):`<div class="empty-state">没有符合当前筛选条件的模型</div>`;bindRows()}
  function render(){renderSidebar();renderSummary();renderList();$$('.provider-filter').forEach(b=>b.classList.toggle('active',b.dataset.provider===activeProvider));$$('.type-tab').forEach(b=>b.classList.toggle('active',b.dataset.type===activeType))}
  async function load(){try{const out=await api('/api/providers');const remote=(out.providers||[]).map(sanitizeProvider);const local=loadLocalProviders();if(remote.length){providers=remote;saveLocalProviders(providers)}else if(local.length){providers=local}else providers=[];draftProviders=clone(providers);const q=new URLSearchParams(location.search),requested=q.get('provider');if(requested&&draftProviders.some(p=>p.id===requested))activeProvider=requested;render();$('#saveState').textContent='自动保存已开启'}catch(e){const local=loadLocalProviders();providers=local;draftProviders=clone(local);if(draftProviders.length){render();$('#saveState').textContent='已恢复本地缓存';return}$('#modelList').innerHTML=`<div class="empty-state">无法读取模型：请确认服务已启动并检查登录状态。<br><br>如果设置了访问密码，请先返回画布完成登录。</div>`}}
  async function saveAll(silent=false){
    if(saving)return;
    clearTimeout(autoSaveTimer);
    syncVisibleRows();
    const invalid=flattened().find(({m})=>m.__capInvalid||m.__priceInvalid||m.__reqInvalid||m.__opInvalid||!String(m.id||'').trim()||!m.modality);
    if(invalid){$('#saveState').textContent='存在配置错误';if(!silent)showToast('存在模型 ID 为空或 JSON 格式错误，请检查展开的模型配置');return}
    saving=true;$('#saveState').textContent=silent?'正在自动保存…':'正在保存…';
    try{
      for(const p of draftProviders){const payload=clone(p);if(!String(payload.apiKey||'').trim())delete payload.apiKey;delete payload.hasApiKey;await api('/api/providers',{method:'POST',body:JSON.stringify(payload)})}
      const fresh=await api('/api/providers');providers=fresh.providers||[];
      draftProviders=clone(providers);
      saveLocalProviders(providers);
      dirty=false;$('#saveState').textContent='已保存 · 画布已可用';
      if(!silent)showToast(`已保存 ${flattened().length} 个模型`);
      setTimeout(()=>{if(!dirty)$('#saveState').textContent='自动保存已开启'},1800);
    }catch(e){$('#saveState').textContent='保存失败';if(!silent)showToast('保存失败，请检查接口配置或网络状态。')}finally{saving=false}
  }
  $('#backCanvas').onclick=async()=>{
    if(dirty)await saveAll(true);
    location.href='./?modelsUpdated='+Date.now();
  };
  $('#openProviderSettings').onclick=()=>location.href='./?open=providers';
  $('#modelSearch').oninput=e=>{syncVisibleRows();query=e.target.value.trim().toLowerCase();renderList()};
  $('#enabledOnly').onchange=e=>{syncVisibleRows();enabledOnly=e.target.checked;renderList()};
  $$('.type-tab').forEach(b=>b.onclick=()=>{syncVisibleRows();activeType=b.dataset.type;render()});
  $('#expandAll').onclick=()=>$$('.model-row').forEach(r=>r.classList.add('open'));
  $('#collapseAll').onclick=()=>$$('.model-row').forEach(r=>r.classList.remove('open'));
  $('#addModel').onclick=()=>{syncVisibleRows();let p=activeProvider!=='all'?draftProviders.find(x=>x.id===activeProvider):draftProviders[0];if(!p)return showToast('请先创建一个 接口供应商');p.models=p.models||[];p.models.unshift(defaultModel());activeProvider=p.id;markDirty();render();const first=$('.model-row');first?.classList.add('open');first?.scrollIntoView({behavior:'smooth',block:'center'})};
  $('#saveAll').onclick=()=>saveAll(false);
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
  window.addEventListener('pagehide',()=>{if(dirty)saveAll(true)});
  load();
})();
