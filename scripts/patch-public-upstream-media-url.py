from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = ROOT / '_read_123_zip_20260821_180410'
APP = APP_ROOT / 'app.js'
PREVIEW = APP_ROOT / 'browser-runtime-preview.js'
ROUTER = APP_ROOT / 'browser-runtime.js'
BOOTSTRAP = APP_ROOT / 'browser-bootstrap.js'
TEST = APP_ROOT / 'tests' / 'public-upstream-media-url.test.mjs'

VERSION = '20260902-public-upstream-media-1'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


def replace_count(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected exactly {expected} matches, found {count}')
    return text.replace(old, new)


app = APP.read_text(encoding='utf-8')
app = replace_once(
    app,
    "  function collectReferences(nodeId){\n",
    """  function generationReferenceUrl(node){
    const source=String(node?.outputSourceUrl||'').trim();
    if(/^https:\/\//i.test(source))return source;
    return String(node?.outputUrl||'').trim();
  }
  function collectReferences(nodeId){
""",
    'insert generation reference URL selector',
)
app = replace_count(
    app,
    "url:x.outputUrl||'',text:x.generatedText||x.text||x.prompt||'',kind:x.type,role",
    "url:generationReferenceUrl(x),sourceUrl:String(x.outputSourceUrl||''),text:x.generatedText||x.text||x.prompt||'',kind:x.type,role",
    2,
    'route connected nodes through public source URL',
)
APP.write_text(app, encoding='utf-8')

preview = PREVIEW.read_text(encoding='utf-8')
preview = replace_once(
    preview,
    """function outputObject(value,modality='text'){
  if(value==null)return null;
  if(typeof value==='object'&&value.type&&('value'in value))return value;
  if(modality==='text')return{type:'text',value:String(value),text:String(value)};
  return{type:'url',value:String(value),url:String(value),sourceUrl:String(value)};
}
""",
    """function outputObject(value,modality='text',sourceUrl=''){
  if(value==null)return null;
  if(typeof value==='object'&&value.type&&('value'in value))return value;
  if(modality==='text')return{type:'text',value:String(value),text:String(value)};
  return{type:'url',value:String(value),url:String(value),sourceUrl:String(sourceUrl||value)};
}
""",
    'allow outputObject to preserve provider source URL',
)
preview = replace_once(
    preview,
    """      value=await normalizeGeneratedOutput(value,modality,provider);
      if(modality==='video')value=await materializeGeneratedVideoOutput(value,provider);
      if(modality==='image'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到图片结果字段');
      if(modality==='video'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到视频结果字段');
      let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(value,provider,model,task.parameters||{});value=dimensionInfo.value}
      const upstreamSize=modality==='image'?imageResponseSize(raw):'';
      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,modality),...imageDimensionTaskPatch(dimensionInfo),...(upstreamSize?{upstreamSize}:{})});
""",
    """      value=await normalizeGeneratedOutput(value,modality,provider);
      const sourceUrl=modality==='image'&&typeof value==='string'&&/^https:\/\//i.test(value.trim())?value.trim():'';
      if(modality==='video')value=await materializeGeneratedVideoOutput(value,provider);
      if(modality==='image'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到图片结果字段');
      if(modality==='video'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到视频结果字段');
      let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(value,provider,model,task.parameters||{});value=dimensionInfo.value}
      const upstreamSize=modality==='image'?imageResponseSize(raw):'';
      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,modality,sourceUrl),...imageDimensionTaskPatch(dimensionInfo),...(upstreamSize?{upstreamSize}:{})});
""",
    'preserve public image source before local dimension persistence',
)
PREVIEW.write_text(preview, encoding='utf-8')

router = ROUTER.read_text(encoding='utf-8')
router = replace_count(
    router,
    '20260902-upstream-generation-inputs-1',
    VERSION,
    2,
    'refresh browser runtime router cache keys',
)
ROUTER.write_text(router, encoding='utf-8')

bootstrap = BOOTSTRAP.read_text(encoding='utf-8')
bootstrap = replace_once(
    bootstrap,
    "const v='20260902-upstream-generation-inputs-1';",
    f"const v='{VERSION}';",
    'refresh canvas bootstrap cache key',
)
BOOTSTRAP.write_text(bootstrap, encoding='utf-8')

TEST.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('connected generated media prefers its original public source URL',()=>{
  assert.ok(app.includes('function generationReferenceUrl(node){'));
  assert.ok(app.includes("const source=String(node?.outputSourceUrl||'').trim();"));
  assert.ok(app.includes("return String(node?.outputUrl||'').trim();"));
  assert.equal((app.match(/url:generationReferenceUrl\\(x\\)/g)||[]).length,2);
  assert.equal((app.match(/sourceUrl:String\\(x\\.outputSourceUrl\\|\\|''\\)/g)||[]).length,2);
});

test('browser image persistence keeps provider source separate from local display URL',()=>{
  assert.ok(preview.includes("function outputObject(value,modality='text',sourceUrl='')"));
  assert.ok(preview.includes('sourceUrl:String(sourceUrl||value)'));
  assert.ok(preview.includes("const sourceUrl=modality==='image'&&typeof value==='string'"));
  assert.ok(preview.includes('output:outputObject(value,modality,sourceUrl)'));
});

test('public upstream media repair is cache busted in both runtime layers',()=>{
  assert.ok(router.includes('20260902-public-upstream-media-1'));
  assert.ok(bootstrap.includes('20260902-public-upstream-media-1'));
});
""", encoding='utf-8')

print('patched public upstream media URL preservation')
