from pathlib import Path
import re

root=Path('_read_123_zip_20260821_180410')
upstream=root/'upstream-generation-inputs-v1.js'
test=root/'tests/upstream-generation-inputs.test.mjs'
bootstrap=root/'browser-bootstrap.js'
index=root/'index.html'

def replace_once(path, old, new, label):
    text=path.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    path.write_text(text.replace(old,new,1),encoding='utf-8')

old="""function referenceVideoParameters(task={},refs=[]){
  const current={...(task.parameters||{})},media=mediaReferences(refs);
  if(!media.length)return current;
  const explicit=clean(current.operation||current.videoOperation).toLowerCase();
  const roles=media.map(ref=>clean(ref.role||ref.semanticRole).toLowerCase());
  const hasFirst=roles.some(role=>/first/.test(role)),hasLast=roles.some(role=>/last/.test(role));
  let operation=explicit;
  if(!operation){
    if(hasFirst&&hasLast)operation='first-last-frame';
    else operation='reference2video';
  }
  const currentMode=clean(current.videoMode||current.generationMode).toLowerCase();
  const keepSpecial=['image2video','frame2video','omni_reference'].includes(currentMode);
  const mode=keepSpecial?currentMode:(hasFirst&&hasLast?'frame2video':'omni_reference');
  return{...current,operation,videoMode:mode,generationMode:mode};
}
"""
new="""function referenceVideoParameters(task={},refs=[]){
  const current={...(task.parameters||{})},media=mediaReferences(refs);
  if(!media.length)return current;
  const explicit=clean(current.operation||current.videoOperation).toLowerCase();
  const images=media.filter(ref=>clean(ref.type||ref.kind).toLowerCase()==='image');
  const videos=media.filter(ref=>clean(ref.type||ref.kind).toLowerCase()==='video');
  const audios=media.filter(ref=>clean(ref.type||ref.kind).toLowerCase()==='audio');
  const roles=media.map(ref=>clean(ref.role||ref.semanticRole).toLowerCase());
  const hasFirst=roles.some(role=>/first/.test(role)),hasLast=roles.some(role=>/last/.test(role));
  const singleImage=images.length===1&&!videos.length&&!audios.length;
  let operation=explicit;
  if(!operation){
    if(hasFirst&&hasLast)operation='first-last-frame';
    else if(singleImage)operation='image2video';
    else operation='reference2video';
  }
  const currentMode=clean(current.videoMode||current.generationMode).toLowerCase();
  const keepSpecial=['image2video','frame2video','omni_reference'].includes(currentMode);
  const mode=keepSpecial?currentMode:(hasFirst&&hasLast?'frame2video':singleImage?'image2video':'omni_reference');
  return{...current,operation,videoMode:mode,generationMode:mode};
}
"""
replace_once(upstream,old,new,'single image mode promotion')

text=test.read_text(encoding='utf-8')
text=text.replace("assert.equal(task.parameters.videoMode,'omni_reference');\n  assert.equal(task.parameters.generationMode,'omni_reference');\n  assert.equal(task.parameters.operation,'reference2video');","assert.equal(task.parameters.videoMode,'image2video');\n  assert.equal(task.parameters.generationMode,'image2video');\n  assert.equal(task.parameters.operation,'image2video');",1)
text=text.replace("assert.equal(task.parameters.videoMode,'omni_reference');\n});","assert.equal(task.parameters.videoMode,'image2video');\n});",1)
if "import fs from 'node:fs';" not in text:
    text=text.replace("import assert from 'node:assert/strict';\n", "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport vm from 'node:vm';\n")
marker="""test('explicit first and last frames preserve frame generation semantics',()=>{\n"""
integration="""test('single connected image becomes XOGPU first frame instead of weak omni reference',()=>{\n  const task=Upstream.normalizeTask({\n    nodeType:'video',prompt:'',references:[],\n    parameters:{videoMode:'text2video',generationMode:'text2video',creativeContext:{linkedReferences:[\n      {id:'text-1',type:'text',role:'prompt_context',text:'让角色缓慢向镜头走来'},\n      {id:'image-1',type:'image',role:'reference',url:'https://cdn.example.com/character.png'}\n    ]}}\n  });\n  const src=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');\n  const ctx={globalThis:{},URL};vm.createContext(ctx);vm.runInContext(src,ctx);\n  const V=ctx.globalThis.CanvasVideoProtocolRegistry;\n  const operation=V.detectOperation({references:task.references,parameters:task.parameters});\n  assert.equal(operation,'image-to-video');\n  const mapped=V.mapRequest(\n    {baseUrl:'https://xogpu.com/v1'},\n    {id:'MiniMax-H3',name:'MiniMax H3'},\n    task,\n    {protocolFamily:'xogpu-minimax-h3',videoOperation:operation},\n    task.references\n  );\n  const image=mapped.body.content.find(item=>item.type==='image_url');\n  assert.equal(image.role,'first_frame');\n  assert.equal(image.image_url.url,'https://cdn.example.com/character.png');\n});\n\n"""
if integration not in text:
    if marker not in text: raise SystemExit('integration marker missing')
    text=text.replace(marker,integration+marker,1)
test.write_text(text,encoding='utf-8')

replace_once(bootstrap,"const v='20260902-provider-binding-guard-1';","const v='20260902-single-image-video-reference-1';",'bootstrap dynamic cache')
idx=index.read_text(encoding='utf-8')
idx,n=re.subn(r'browser-bootstrap\.js\?v=[^\"]+', 'browser-bootstrap.js?v=20260902-single-image-video-reference-1', idx, count=1)
if n!=1: raise SystemExit(f'bootstrap index cache: expected 1 match, got {n}')
index.write_text(idx,encoding='utf-8')
