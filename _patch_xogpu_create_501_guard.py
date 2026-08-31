from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')

browser=ROOT/'browser-runtime.js'
s=browser.read_text(encoding='utf-8')
old="""      }catch(error){
        lastCreateError=error;
        if(Number(error?.status)===429&&modality==='video')recordProviderCreateRateLimit(provider,route,error?.retryAfterMs);
        if(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;
      }
"""
new="""      }catch(error){
        lastCreateError=error;
        if(modality==='video'&&isXogpuVideoRoute(route)&&isXogpuNotImplementedError(error,route)){
          const original=runtimeErrorText(error)||'HTTP 501 not_implemented';
          error.noRetry=true;
          error.code='XOGPU_CREATE_NOT_IMPLEMENTED';
          error.message=`XOGPU MiniMax-H3 创建接口返回 ${original}。该错误来自供应商 MiniMax 渠道实现；请求可能已被上游受理或计费。为避免重复扣费，网站不会自动重新提交。`;
          updateTask(task.id,{submissionState:'uncertain',lastError:error.message,errorStatus:Number(error?.status)||501,videoProtocolDiagnostics:{...(findTask(task.id)?.videoProtocolDiagnostics||{}),createPath,createErrorStatus:Number(error?.status)||501,createErrorCode:'XOGPU_CREATE_NOT_IMPLEMENTED'}});
          throw error;
        }
        if(Number(error?.status)===429&&modality==='video')recordProviderCreateRateLimit(provider,route,error?.retryAfterMs);
        if(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;
      }
"""
if old not in s:
    raise SystemExit('browser create catch marker not found')
s=s.replace(old,new,1)
browser.write_text(s,encoding='utf-8')

# Add regression test.
test=ROOT/'tests'/'xogpu-create-501-guard.test.mjs'
test.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');

test('XOGPU create-stage 501 is treated as uncertain submission and never auto-retried',()=>{
  assert.match(src,/isXogpuVideoRoute\\(route\\)&&isXogpuNotImplementedError\\(error,route\\)/);
  assert.match(src,/error\.noRetry=true/);
  assert.match(src,/error\.code='XOGPU_CREATE_NOT_IMPLEMENTED'/);
  assert.match(src,/submissionState:'uncertain'/);
  assert.match(src,/为避免重复扣费，网站不会自动重新提交/);
});
""",encoding='utf-8')

print('XOGPU create 501 guard applied')
