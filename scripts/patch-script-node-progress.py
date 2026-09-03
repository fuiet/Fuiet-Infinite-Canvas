from pathlib import Path
import re

root=Path('_read_123_zip_20260821_180410')
app=root/'app.js'
bootstrap=root/'browser-bootstrap.js'
index=root/'index.html'
css=root/'styles/script-node-progress-v1.css'
test=root/'tests/script-node-progress.test.mjs'

def replace_once(path, old, new, label):
    text=path.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    path.write_text(text.replace(old,new,1),encoding='utf-8')

replace_once(app,
"""  function uiV23ProgressHtml(n,taskState){
    if(!['queued','running'].includes(taskState))return'';
""",
"""  function uiV23ProgressHtml(n,taskState){
    if(n?.type==='script')return'';
    if(!['queued','running'].includes(taskState))return'';
""",'suppress duplicate script progress')

old_script="""    } else if(n.type==='script'){
      const data=ensureScriptData(n); const shots=data.shots||[];
      body = `<div class=\"script-node-compact\"><div class=\"script-compact-icon\"><i></i><i></i><i></i><i></i></div><div class=\"script-try-label\">尝试：</div><button data-script-preset=\"breakdown\">☰ <b>脚本生成分镜脚本</b></button><button data-script-preset=\"character\">♙ <b>角色生成分镜脚本</b></button><button data-script-preset=\"manual\">▤ <b>自己编写分镜脚本</b></button>${shots.length?`<small>${shots.length} 个镜头 · 点击卡片查看/继续编辑</small>`:''}</div>`;
"""
new_script="""    } else if(n.type==='script'){
      const data=ensureScriptData(n),shots=data.shots||[],scriptBusy=['queued','running'].includes(taskState);
      if(scriptBusy){
        const scriptPct=Math.max(2,Math.min(99,Math.round(Number(n.taskProgress)||2))),scriptLabel=taskState==='queued'?'排队中':'生成中';
        body=`<div class=\"script-node-generating\"><div class=\"script-node-skeleton\" aria-hidden=\"true\">${new Array(18).fill('<i></i>').join('')}</div><button type=\"button\" class=\"script-node-progress-pill\" data-script-cancel=\"${n.id}\" title=\"点击取消当前脚本生成任务\"><span>${scriptLabel} <b>${scriptPct}%</b>…</span><em>取消</em></button></div>`;
      }else body = `<div class=\"script-node-compact\"><div class=\"script-compact-icon\"><i></i><i></i><i></i><i></i></div><div class=\"script-try-label\">尝试：</div><button data-script-preset=\"breakdown\">☰ <b>脚本生成分镜脚本</b></button><button data-script-preset=\"character\">♙ <b>角色生成分镜脚本</b></button><button data-script-preset=\"manual\">▤ <b>自己编写分镜脚本</b></button>${shots.length?`<small>${shots.length} 个镜头 · 点击卡片查看/继续编辑</small>`:''}</div>`;
"""
replace_once(app,old_script,new_script,'script generating body')

replace_once(app,
"""    $('[data-node-retry]',el)?.addEventListener('click',e=>{e.stopPropagation();generateForNode(n).catch(()=>{})});
""",
"""    $('[data-node-retry]',el)?.addEventListener('click',e=>{e.stopPropagation();generateForNode(n).catch(()=>{})});
    $('[data-script-cancel]',el)?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();cancelScriptNodeTask(n)});
""",'script cancel binding')

old_wait="""  async function waitTask(taskId,loops=420){let info;for(let i=0;i<loops;i++){await new Promise(r=>setTimeout(r,700));info=(await apiJson('/api/tasks/'+taskId)).task;if(['succeeded','failed','canceled'].includes(info.status))break}return info;}
"""
new_wait="""  async function waitTask(taskId,loops=420,onProgress=null){let info;for(let i=0;i<loops;i++){await new Promise(r=>setTimeout(r,700));info=(await apiJson('/api/tasks/'+taskId)).task;try{onProgress?.(info,i)}catch{}if(['succeeded','failed','canceled'].includes(info.status))break}return info;}
  function scriptTaskProgressMeta(n,info={}){
    const status=String(info.status||n.taskStatus||'running');if(status==='succeeded')return{percent:100,estimated:false};
    const provider=Number(info.providerProgress),task=Number(info.progress);if(Number.isFinite(provider)&&provider>0&&provider<100)return{percent:Math.round(provider),estimated:false};if(Number.isFinite(task)&&task>2&&task<100)return{percent:Math.round(task),estimated:false};
    const started=Math.max(0,Number(n.scriptGenerationStartedAt)||Date.now()),elapsed=Math.max(0,Date.now()-started),current=Math.max(2,Number(n.taskProgress)||2);return{percent:Math.min(92,Math.max(current,2+Math.floor(elapsed/1200))),estimated:true};
  }
  function updateScriptTaskNode(n,info={}){
    if(!n)return;const status=String(info.status||n.taskStatus||'running'),meta=scriptTaskProgressMeta(n,info),changed=status!==String(n.taskStatus||'')||meta.percent!==Math.round(Number(n.taskProgress)||0)||meta.estimated!==Boolean(n.scriptProgressEstimated);if(!changed)return;n.taskStatus=status;n.taskProgress=meta.percent;n.scriptProgressEstimated=meta.estimated;if(info.error)n.taskError=errorText(info.error);syncNodeTaskDiagnostics(n,info);saveState();render();
  }
  function beginScriptTaskNode(n,task={}){n.taskId=String(task.id||'');n.taskStatus=String(task.status||'queued');n.taskProgress=Math.max(2,Number(task.progress)||2);n.scriptProgressEstimated=true;n.scriptGenerationStartedAt=Date.now();n.taskError='';syncNodeTaskDiagnostics(n,task);saveState();render()}
  function finishScriptTaskNode(n,status=''){if(!n)return;n.taskStatus=status; n.taskProgress=status==='succeeded'?100:0;n.scriptProgressEstimated=false;delete n.scriptGenerationStartedAt;saveState();render()}
  async function cancelScriptNodeTask(n){if(!n?.taskId)return;try{await apiJson('/api/tasks/'+encodeURIComponent(n.taskId),{method:'DELETE'});finishScriptTaskNode(n,'canceled');showToast('已取消脚本生成')}catch(e){showToast('取消失败：'+errorText(e))}}
"""
replace_once(app,old_wait,new_wait,'waitTask progress callback')

old_create="""const created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({providerId:pid,modelId:mid,providerSnapshot:snapshotProviderForTask(provider),modelSnapshot:model,nodeType:'text',prompt,references:collectReferences(n.id),parameters:{operation:'script_breakdown',responseFormat:'json_object',schema}})});const info=await waitTask(created.task.id);if(info?.status!=='succeeded')throw new Error(errorText(info?.error)||'脚本拆解失败');"""
new_create="""const created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({providerId:pid,modelId:mid,providerSnapshot:snapshotProviderForTask(provider),modelSnapshot:model,nodeType:'text',prompt,references:collectReferences(n.id),parameters:{operation:'script_breakdown',responseFormat:'json_object',schema}})});beginScriptTaskNode(n,created.task);const info=await waitTask(created.task.id,420,info=>updateScriptTaskNode(n,info));if(info?.status==='canceled'){finishScriptTaskNode(n,'canceled');showToast('已取消脚本生成');return}if(info?.status!=='succeeded')throw new Error(errorText(info?.error)||'脚本拆解失败');finishScriptTaskNode(n,'succeeded');"""
replace_once(app,old_create,new_create,'script task progress wiring')

replace_once(app,
"""}catch(e){showToast('拆解失败：'+errorText(e))}
""",
"""}catch(e){finishScriptTaskNode(n,'');n.taskError=errorText(e);saveState();render();showToast('拆解失败：'+errorText(e))}
""",'script failure reset')

css.write_text("""/* Script node generation progress · reference-matched compact state */
.script-node-generating{min-height:224px;display:flex;flex-direction:column;justify-content:space-between;gap:18px;padding:10px 10px 12px;box-sizing:border-box}.script-node-skeleton{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 8px;padding:0}.script-node-skeleton i{display:block;height:18px;border-radius:3px;background:linear-gradient(90deg,#2b2d2f 18%,#3a3d40 50%,#2b2d2f 82%);background-size:220% 100%;animation:script-node-shimmer 1.45s ease-in-out infinite}.script-node-skeleton i:nth-child(3n+2){animation-delay:.09s}.script-node-skeleton i:nth-child(3n){animation-delay:.18s}.script-node-progress-pill{align-self:center;min-width:124px;height:28px;padding:0 8px 0 12px;border:1px solid #676b70;border-radius:7px;background:#17191b;color:#f0f1f2;display:flex;align-items:center;justify-content:center;gap:7px;font:inherit;font-size:10px;box-shadow:0 5px 16px rgba(0,0,0,.22);cursor:pointer}.script-node-progress-pill:hover{border-color:#8b9096;background:#1d2023}.script-node-progress-pill span{white-space:nowrap}.script-node-progress-pill b{font-weight:700}.script-node-progress-pill em{font-style:normal;color:#8e949a;padding-left:7px;border-left:1px solid #3d4145}.script-node-progress-pill:hover em{color:#d8dbde}@keyframes script-node-shimmer{0%{background-position:110% 0}100%{background-position:-110% 0}}@media(prefers-reduced-motion:reduce){.script-node-skeleton i{animation:none}}
""",encoding='utf-8')

test.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-node-progress-v1.css',import.meta.url),'utf8');

test('script breakdown mirrors task progress into the script node',()=>{
  assert.match(app,/waitTask\(taskId,loops=420,onProgress=null\)/);
  assert.match(app,/beginScriptTaskNode\(n,created\.task\)/);
  assert.match(app,/waitTask\(created\.task\.id,420,info=>updateScriptTaskNode\(n,info\)\)/);
  assert.match(app,/scriptTaskProgressMeta/);
});

test('script node renders skeleton progress and cancel action while generating',()=>{
  assert.match(app,/script-node-generating/);
  assert.match(app,/new Array\(18\)\.fill\('<i><\\\/i>'\)/);
  assert.match(app,/data-script-cancel/);
  assert.match(app,/cancelScriptNodeTask/);
  assert.match(css,/script-node-progress-pill/);
  assert.match(css,/script-node-shimmer/);
});
""",encoding='utf-8')

replace_once(bootstrap,"const v='20260902-single-image-video-reference-1';","const v='20260903-script-node-progress-1';",'bootstrap cache version')
replace_once(bootstrap,"""      loadStyle(`./styles/script-workflow-v2.css?v=${v}`),
""","""      loadStyle(`./styles/script-workflow-v2.css?v=${v}`),
      loadStyle(`./styles/script-node-progress-v1.css?v=${v}`),
""",'progress stylesheet load')
idx=index.read_text(encoding='utf-8')
idx,n=re.subn(r'browser-bootstrap\.js\?v=[^\"]+', 'browser-bootstrap.js?v=20260903-script-node-progress-1', idx, count=1)
if n!=1: raise SystemExit(f'index bootstrap cache: expected 1 match, got {n}')
index.write_text(idx,encoding='utf-8')
