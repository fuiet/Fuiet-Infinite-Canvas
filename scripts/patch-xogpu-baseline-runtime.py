from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = ROOT / '_read_123_zip_20260821_180410'
PREVIEW = APP_ROOT / 'browser-runtime-preview.js'
ROUTER = APP_ROOT / 'browser-runtime.js'
ADAPTER = APP_ROOT / 'provider-adapter-contract.js'
INDEX = APP_ROOT / 'index.html'
TEST = APP_ROOT / 'tests' / 'xogpu-baseline-runtime.test.mjs'
VERSION = '20260902-xogpu-baseline-runtime-1'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, repl, label):
    out, count = re.subn(pattern, repl, text, count=1)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly 1 match, got {count}')
    return out

adapter = ADAPTER.read_text(encoding='utf-8')
adapter = replace_once(adapter, "billingGroup:'特惠视频生成'", "billingGroup:'discount_video_generation'", 'restore internal XOGPU billing group')
ADAPTER.write_text(adapter, encoding='utf-8')

router = ROUTER.read_text(encoding='utf-8')
router = regex_once(router, r"browser-runtime-preview\.js\?v=[^'\"]+", f'browser-runtime-preview.js?v={VERSION}', 'bump preview runtime cache')
ROUTER.write_text(router, encoding='utf-8')

index = INDEX.read_text(encoding='utf-8')
index = regex_once(index, r"provider-adapter-contract\.js\?v=[^\"]+", f'provider-adapter-contract.js?v={VERSION}', 'bump adapter cache')
index = regex_once(index, r"browser-runtime\.js\?v=[^\"]+", f'browser-runtime.js?v={VERSION}', 'bump router cache')
INDEX.write_text(index, encoding='utf-8')

preview = PREVIEW.read_text(encoding='utf-8')
needle = """      }catch(error){\n        lastCreateError=error;\n        if(modality==='video'&&isXogpuVideoRoute(route)&&isXogpuNotImplementedError(error,route)){"""
replacement = """      }catch(error){\n        lastCreateError=error;\n        if(modality==='video'&&isXogpuVideoRoute(route)){\n          const safeUrl=value=>{try{const u=new URL(String(value||''));return u.origin+u.pathname}catch{return String(value||'')}};\n          const requestBody=await videoJsonBody().catch(()=>({}));\n          const original=runtimeErrorText(error)||String(error?.message||error||'XOGPU 请求失败');\n          error.message=`${original} [XOGPU URL ${safeUrl(createUrl)}；Base ${safeUrl(provider.baseUrl)}；model ${String(requestBody?.model||model?.id||'')}；group ${String(requestBody?.group||'')}]`;\n          updateTask(task.id,{videoProtocolDiagnostics:{...(findTask(task.id)?.videoProtocolDiagnostics||{}),createPath,createUrl:safeUrl(createUrl),baseUrl:safeUrl(provider.baseUrl),requestModel:String(requestBody?.model||model?.id||''),requestGroup:String(requestBody?.group||'')}});\n        }\n        if(modality==='video'&&isXogpuVideoRoute(route)&&isXogpuNotImplementedError(error,route)){"""
preview = replace_once(preview, needle, replacement, 'add safe XOGPU create diagnostics')
PREVIEW.write_text(preview, encoding='utf-8')

TEST.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const adapter=fs.readFileSync(new URL('../provider-adapter-contract.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('XOGPU keeps the known-working internal billing group',()=>{
  assert.ok(adapter.includes("billingGroup:'discount_video_generation'"));
  assert.ok(!adapter.includes("billingGroup:'特惠视频生成'"));
});

test('browser loads a fresh XOGPU runtime after rollback',()=>{
  assert.ok(router.includes('browser-runtime-preview.js?v=20260902-xogpu-baseline-runtime-1'));
  assert.ok(index.includes('provider-adapter-contract.js?v=20260902-xogpu-baseline-runtime-1'));
  assert.ok(index.includes('browser-runtime.js?v=20260902-xogpu-baseline-runtime-1'));
});

test('XOGPU create errors expose safe route diagnostics without credentials',()=>{
  assert.ok(preview.includes('[XOGPU URL ${safeUrl(createUrl)}；Base ${safeUrl(provider.baseUrl)}；model ${String(requestBody?.model||model?.id||\'\')}；group ${String(requestBody?.group||\'\')}]'));
  assert.ok(preview.includes('createUrl:safeUrl(createUrl)'));
  assert.ok(!preview.includes('requestApiKey'));
});
""", encoding='utf-8')

print('patched XOGPU baseline runtime and diagnostics')
