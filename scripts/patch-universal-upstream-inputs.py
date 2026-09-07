from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / '_read_123_zip_20260821_180410'


def read(path):
    return path.read_text(encoding='utf-8')


def write(path, text):
    path.write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 regex match, got {count}')
    return out


# 1) Universal task-boundary normalization for every actual generation modality.
upstream_path = APP / 'upstream-generation-inputs-v1.js'
upstream = read(upstream_path)
if "const GENERATION_TYPES=new Set(['text','script','image','video','audio']);" not in upstream:
    upstream = replace_once(
        upstream,
        "const MEDIA_TYPES=new Set(['image','video','audio']);",
        "const MEDIA_TYPES=new Set(['image','video','audio']);\nconst GENERATION_TYPES=new Set(['text','script','image','video','audio']);",
        'upstream generation types',
    )

new_normalize = r'''function normalizeTask(task={}){
  const type=clean(task.nodeType).toLowerCase();
  if(!GENERATION_TYPES.has(type))return task;
  const refs=linkedReferences(task),generatorPrompt=clean(task.prompt),prompt=effectivePrompt(task,refs);
  const textCount=upstreamTextParts(refs).length,mediaCount=mediaReferences(refs).length;
  const parameters=type==='video'?referenceVideoParameters(task,refs):{...(task.parameters||{})};
  const promptProvenance=['image','video'].includes(type)?scriptPromptProvenance({...task,parameters},{generatorPrompt,providerPrompt:prompt}):null;
  return{
    ...task,
    prompt,
    references:refs,
    parameters:{
      ...parameters,
      ...(promptProvenance?{promptProvenance}:{}),
      upstreamInputContract:{version:5,connected:refs.length>0,textCount,mediaCount,scriptAssetCount:refs.filter(ref=>clean(ref.kind)==='script_asset').length,scriptStyleCount:refs.filter(ref=>clean(ref.kind)==='script_style').length,promptProvenance:Boolean(promptProvenance),localPromptOptional:refs.length>0}
    }
  };
}
function isTaskCreate'''
upstream = regex_once(
    upstream,
    r"function normalizeTask\(task=\{\}\)\{.*?\n\}\nfunction isTaskCreate",
    new_normalize,
    'universal normalizeTask',
)
upstream = upstream.replace('Connected upstream nodes are generation inputs, not decorative graph metadata.', 'Connected upstream nodes are mandatory generation inputs for every generation modality, not decorative graph metadata.')
write(upstream_path, upstream)


# Shared runtime helpers copied into desktop and browser runtimes. They make text references
# part of the actual prompt and pass supported image/video references natively to multimodal chat.
RUNTIME_HELPERS = r'''function mergeUpstreamReferenceText(prompt,references=[]){
  const local=String(prompt||'').trim(),parts=[];
  const add=value=>{value=String(value||'').trim();if(!value||parts.includes(value)||local.includes(value))return;parts.push(value)};
  for(const ref of (Array.isArray(references)?references:[])){
    const type=String(ref?.type||ref?.kind||'').toLowerCase();
    if(['text','script','markdown'].includes(type))add(ref?.text);
  }
  if(local)parts.push(local);
  return parts.join('\n\n');
}
function upstreamMediaReferenceManifest(references=[]){
  const rows=[];
  for(const ref of (Array.isArray(references)?references:[])){
    const type=String(ref?.type||ref?.kind||'').toLowerCase(),url=String(ref?.url||ref?.outputUrl||ref?.value||'').trim();
    if(!['image','video','audio'].includes(type)||!url)continue;
    const label=type==='image'?'图片':type==='video'?'视频':'音频',title=String(ref?.title||ref?.role||ref?.semanticRole||'参考素材').trim();
    rows.push(`- ${label}「${title}」：${url}`);
  }
  return rows.length?'【上游媒体参考】\n'+rows.join('\n'):'';
}
function providerTextReferenceContent(model,prompt,references=[],mode='chat'){
  const refs=Array.isArray(references)?references:[],caps=model?.capabilities||{};
  const images=refs.filter(ref=>String(ref?.type||ref?.kind||'').toLowerCase()==='image'&&String(ref?.url||'').trim()).slice(0,12);
  const videos=refs.filter(ref=>String(ref?.type||ref?.kind||'').toLowerCase()==='video'&&String(ref?.url||'').trim()).slice(0,6);
  const audios=refs.filter(ref=>String(ref?.type||ref?.kind||'').toLowerCase()==='audio'&&String(ref?.url||'').trim()).slice(0,6);
  const supportsVision=caps.supportsVision===true,supportsVideo=caps.supportsVideoUnderstanding===true;
  const fallback=[...(!supportsVision?images:[]),...(mode==='chat'&&supportsVideo?[]:videos),...audios];
  let text=mergeUpstreamReferenceText(prompt,refs),manifest=upstreamMediaReferenceManifest(fallback);
  if(manifest)text=[text,manifest].filter(Boolean).join('\n\n');
  if(!text)text='请严格参考已连接的上游节点内容完成生成。';
  if(mode==='responses'){
    const content=[{type:'input_text',text}];
    if(supportsVision)for(const ref of images)content.push({type:'input_image',image_url:ref.url});
    return{text,content};
  }
  const content=[{type:'text',text}];
  if(supportsVision)for(const ref of images)content.push({type:'image_url',image_url:{url:ref.url}});
  if(supportsVideo)for(const ref of videos)content.push({type:'video_url',video_url:{url:ref.url}});
  return{text,content:content.length>1?content:text};
}
'''

server_path = APP / 'server.js'
server = read(server_path)
if 'function providerTextReferenceContent(' not in server:
    server = replace_once(server, 'async function executeGeneric(task, provider, model, payload) {', RUNTIME_HELPERS + '\nasync function executeGeneric(task, provider, model, payload) {', 'server helper insertion')

server = replace_once(
    server,
    "body={model:model.id,messages:[{role:'user',content:payload.prompt||''}]};\n    if(payload.parameters?.responseFormat==='json_object')body.response_format={type:'json_object'};",
    "const mapped=providerTextReferenceContent(model,payload.prompt||'',payload.references||[],'chat');\n    body={model:model.id,messages:[{role:'user',content:mapped.content}]};\n    if(payload.parameters?.responseFormat==='json_object')body.response_format={type:'json_object'};",
    'server generic chat references',
)
server = replace_once(
    server,
    "body={model:model.id,input:payload.prompt||''};",
    "const mapped=providerTextReferenceContent(model,payload.prompt||'',payload.references||[],'responses');\n    body={model:model.id,input:mapped.content.length>1?[{role:'user',content:mapped.content}]:mapped.text};",
    'server generic responses references',
)

new_server_chat = r'''async function executeOpenAIChat(task, provider, model, payload, useResponses=false) {
  const refs=payload.references||[];
  updateTask(task,{progress:10});
  if(useResponses){
    const mapped=providerTextReferenceContent(model,payload.prompt||'',refs,'responses');
    const input=mapped.content.length>1?[{role:'user',content:mapped.content}]:mapped.text;
    const body={model:model.id,input};
    const data=await fetchJson(joinUrl(provider.baseUrl,'/v1/responses'),{method:'POST',headers:providerHeaders(provider),body:JSON.stringify(body),timeoutMs:120000,provider});
    return normalizeOutput(deepGet(data,'output_text')??deepGet(data,'output.0.content.0.text')??data,'text',provider);
  }
  const mapped=providerTextReferenceContent(model,payload.prompt||'',refs,'chat');
  const body={model:model.id,messages:[{role:'user',content:mapped.content}]};
  if(payload.parameters?.responseFormat==='json_object'||payload.parameters?.operation==='script_breakdown'||payload.parameters?.operation==='prompt_synthesis')body.response_format={type:'json_object'};
  const data=await fetchJson(joinUrl(provider.baseUrl,'/v1/chat/completions'),{method:'POST',headers:providerHeaders(provider),body:JSON.stringify(body),timeoutMs:120000,provider});
  return normalizeOutput(deepGet(data,'choices.0.message.content')??data,'text',provider);
}
async function executeOpenAIImage'''
server = regex_once(server, r"async function executeOpenAIChat\(task, provider, model, payload, useResponses=false\) \{.*?\n\}\nasync function executeOpenAIImage", new_server_chat, 'server OpenAI chat multimodal references')
write(server_path, server)


browser_path = APP / 'browser-runtime-preview.js'
browser = read(browser_path)
if 'function providerTextReferenceContent(' not in browser:
    browser = replace_once(browser, 'function defaultRequestBody(provider,model,task,route,refs){', RUNTIME_HELPERS + '\nfunction defaultRequestBody(provider,model,task,route,refs){', 'browser helper insertion')

new_browser_chat = r'''  if(isChatCompletions){
    const images=refs.filter(r=>r.url&&r.type==='image');
    if(Adapters?.isAgnesProvider?.(provider)&&images.some(r=>!/^https?:\/\//i.test(String(r.url||''))))throw new Error('Agnes 文本模型的图像理解仅支持公开可访问的 image_url；浏览器本地图片不能直接提交');
    const mapped=providerTextReferenceContent(model,prompt,refs,'chat');
    return{model:modelId,messages:[{role:'user',content:mapped.content}],...(p.responseFormat==='json_object'?{response_format:{type:'json_object'}}:{})};
  }
  if(route.adapterKey==='openai-responses'){
    const mapped=providerTextReferenceContent(model,prompt,refs,'responses');
    return{model:modelId,input:mapped.content.length>1?[{role:'user',content:mapped.content}]:mapped.text};
  }'''
browser = regex_once(
    browser,
    r"  if\(isChatCompletions\)\{.*?\n  \}\n  if\(route\.adapterKey==='openai-responses'\)return\{model:modelId,input:prompt\};",
    new_browser_chat,
    'browser chat/responses multimodal references',
)
write(browser_path, browser)


# Cache bust both the universal task normalizer and the browser runtime implementation.
bootstrap_path = APP / 'browser-bootstrap.js'
bootstrap = read(bootstrap_path)
bootstrap = bootstrap.replace("const batchInputV='20260907-script-prompt-provenance-3';", "const batchInputV='20260907-universal-upstream-inputs-1';")
write(bootstrap_path, bootstrap)

router_path = APP / 'browser-runtime.js'
router = read(router_path)
router = router.replace('browser-runtime-preview.js?v=20260902-xogpu-baseline-runtime-1', 'browser-runtime-preview.js?v=20260907-universal-upstream-inputs-1')
write(router_path, router)


# Keep existing cache/version regression assertions aligned with the intentional feature revision.
for test_path in (APP / 'tests').glob('*.test.mjs'):
    text = read(test_path)
    text = text.replace('20260907-script-prompt-provenance-3', '20260907-universal-upstream-inputs-1')
    text = text.replace('20260902-xogpu-baseline-runtime-1', '20260907-universal-upstream-inputs-1')
    if test_path.name == 'upstream-generation-inputs.test.mjs':
        text = text.replace('version:4,connected:true', 'version:5,connected:true')
    write(test_path, text)


# Add focused tests proving that text/script/audio tasks no longer bypass the upstream contract.
universal_test = APP / 'tests' / 'universal-upstream-inputs.test.mjs'
universal_test.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Upstream=require('../upstream-generation-inputs-v1.js');

function linked(){return[
  {id:'text-1',type:'text',role:'prompt_context',title:'原始故事',text:'女孩在雨夜车站发现一只受伤的小狗。'},
  {id:'image-1',type:'image',role:'character_reference',title:'女孩角色图',url:'https://cdn.example.com/girl.png'},
  {id:'video-1',type:'video',role:'motion_reference',title:'雨夜动作参考',url:'https://cdn.example.com/rain.mp4'}
]}

test('text generation uses upstream text as primary prompt and preserves image/video references',()=>{
  const task=Upstream.normalizeTask({nodeType:'text',prompt:'请根据素材生成结构化剧本。',references:[],parameters:{operation:'script_breakdown',creativeContext:{linkedReferences:linked()}}});
  assert.ok(task.prompt.startsWith('女孩在雨夜车站发现一只受伤的小狗。'));
  assert.ok(task.prompt.indexOf('女孩在雨夜')<task.prompt.indexOf('请根据素材'));
  assert.equal(task.references.length,3);
  assert.deepEqual(task.references.map(x=>x.type).sort(),['image','text','video']);
  assert.equal(task.parameters.upstreamInputContract.version,5);
  assert.equal(task.parameters.upstreamInputContract.textCount,1);
  assert.equal(task.parameters.upstreamInputContract.mediaCount,2);
});

test('script tasks obey the same universal upstream contract',()=>{
  const task=Upstream.normalizeTask({nodeType:'script',prompt:'补充要求：每集 60 秒。',references:linked(),parameters:{}});
  assert.match(task.prompt,/女孩在雨夜车站/);
  assert.match(task.prompt,/每集 60 秒/);
  assert.equal(task.references.filter(x=>x.type==='image').length,1);
  assert.equal(task.references.filter(x=>x.type==='video').length,1);
  assert.equal(task.parameters.upstreamInputContract.version,5);
});

test('audio generation also receives upstream text and media instead of bypassing the contract',()=>{
  const task=Upstream.normalizeTask({nodeType:'audio',prompt:'生成旁白',references:linked(),parameters:{}});
  assert.ok(task.prompt.startsWith('女孩在雨夜车站'));
  assert.equal(task.references.length,3);
  assert.equal(task.parameters.upstreamInputContract.connected,true);
});

test('desktop and browser text runtimes explicitly support connected image/video references',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
  for(const source of [server,browser]){
    assert.match(source,/function providerTextReferenceContent\(/);
    assert.match(source,/type:'image_url'/);
    assert.match(source,/type:'video_url'/);
    assert.match(source,/mergeUpstreamReferenceText\(prompt,references/);
    assert.match(source,/【上游媒体参考】/);
  }
});

test('browser cache revisions force the universal input contract and runtime refresh',()=>{
  const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
  const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(bootstrap,/20260907-universal-upstream-inputs-1/);
  assert.match(router,/browser-runtime-preview\.js\?v=20260907-universal-upstream-inputs-1/);
});
''', encoding='utf-8')

print('Universal upstream generation inputs patch applied.')
