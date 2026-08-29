from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
core_path=ROOT/'provider-runtime-core.js'
browser_path=ROOT/'browser-runtime.js'
server_path=ROOT/'server.js'
core_test_path=ROOT/'tests'/'provider-runtime-core.test.mjs'
parity_test_path=ROOT/'tests'/'desktop-video-poll-parity.test.mjs'

core=core_path.read_text(encoding='utf-8')
browser=browser_path.read_text(encoding='utf-8')
server=server_path.read_text(encoding='utf-8')
core_test=core_test_path.read_text(encoding='utf-8')
parity_test=parity_test_path.read_text(encoding='utf-8')

def one(text,old,new,label):
    n=text.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 match, got {n}')
    return text.replace(old,new,1)

core=one(core,
"""const DEFAULT_SUCCESS=['completed','succeeded','success','done','finished','ready'];
const DEFAULT_FAILURE=['failed','failure','error','canceled','cancelled','rejected','expired'];""",
"""const DEFAULT_SUCCESS=['completed','succeeded','success','done','finished','ready'];
const DEFAULT_FAILURE=['failed','failure','error','canceled','cancelled','rejected','expired'];
const ASYNC_POLL_URL_PATHS=[
  'poll_url','pollUrl','status_url','statusUrl','task_url','taskUrl',
  'data.poll_url','data.pollUrl','data.status_url','data.statusUrl','data.task_url','data.taskUrl',
  'links.status','links.poll','links.self','task.status_url','task.poll_url'
];""",
'add shared async poll url path registry')

core=one(core,
"""function firstPath(obj,paths=[]){
  for(const path of paths){
    if(!path)continue;
    const value=getPath(obj,path);
    if(value!==undefined&&value!==null&&value!=='')return value;
  }
  return undefined;
}
function findStringByPrefix""",
"""function firstPath(obj,paths=[]){
  for(const path of paths){
    if(!path)continue;
    const value=getPath(obj,path);
    if(value!==undefined&&value!==null&&value!=='')return value;
  }
  return undefined;
}
function extractPollUrl(response){return firstPath(response,ASYNC_POLL_URL_PATHS);}
function findStringByPrefix""",
'add shared extractPollUrl')

core=one(core,
"""  DEFAULT_SUCCESS,DEFAULT_FAILURE,getPath,firstPath,extractTaskId,extractStatus,extractProgress,extractImageOutput,extractOutput,
  classifyAsyncPoll,nextPollDelay,formatFailure,providerErrorText,isRetryableProviderFailure,mapNestedStrings""",
"""  DEFAULT_SUCCESS,DEFAULT_FAILURE,ASYNC_POLL_URL_PATHS,getPath,firstPath,extractPollUrl,extractTaskId,extractStatus,extractProgress,extractImageOutput,extractOutput,
  classifyAsyncPoll,nextPollDelay,formatFailure,providerErrorText,isRetryableProviderFailure,mapNestedStrings""",
'export shared poll url helper')

browser=one(browser,
"""  const responseUrl=Core?.firstPath?Core.firstPath(createdRaw,['poll_url','pollUrl','status_url','statusUrl','task_url','taskUrl','data.poll_url','data.pollUrl','data.status_url','data.statusUrl','data.task_url','data.taskUrl','links.status','links.poll','links.self','task.status_url','task.poll_url']):'';add(responseUrl);""",
"""  const responseUrl=Core?.extractPollUrl?Core.extractPollUrl(createdRaw):'';add(responseUrl);""",
'browser uses shared poll URL extractor')

server=one(server,
"""function standardVideoResponsePollUrl(created,provider,config={}){
  if(config.strictPollPath===true)return'';
  const value=firstDeepValue(created,[
    'poll_url','pollUrl','status_url','statusUrl','task_url','taskUrl',
    'data.poll_url','data.pollUrl','data.status_url','data.statusUrl','data.task_url','data.taskUrl',
    'links.status','links.poll','links.self','task.status_url','task.poll_url'
  ]);
  return providerVideoRouteUrl(provider,value);
}""",
"""function standardVideoResponsePollUrl(created,provider,config={}){
  if(config.strictPollPath===true)return'';
  return providerVideoRouteUrl(provider,ProviderRuntimeCore.extractPollUrl(created));
}""",
'desktop uses shared poll URL extractor')

if "shared runtime core extracts provider supplied poll URLs" not in core_test:
    core_test += """

test('shared runtime core extracts provider supplied poll URLs',()=>{
  assert.equal(Core.extractPollUrl({poll_url:'/v1/jobs/a'}),'/v1/jobs/a');
  assert.equal(Core.extractPollUrl({data:{statusUrl:'https://api.test/jobs/b'}}),'https://api.test/jobs/b');
  assert.equal(Core.extractPollUrl({links:{status:'/tasks/c'}}),'/tasks/c');
  assert.equal(Core.extractPollUrl({status:'processing'}),undefined);
});
"""

parity_test=one(parity_test,
"""const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const registry=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');""",
"""const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const registry=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');""",
'load browser source in parity test')

parity_test=one(parity_test,
"""  assert.match(server,/function standardVideoResponsePollUrl\\(created,provider,config=\\{\\}\\)/);
  assert.match(server,/'poll_url','pollUrl','status_url','statusUrl','task_url','taskUrl'/);
  assert.match(server,/if\\(config\\.strictPollPath===true\\)return''/);""",
"""  assert.match(server,/function standardVideoResponsePollUrl\\(created,provider,config=\\{\\}\\)/);
  assert.match(server,/ProviderRuntimeCore\\.extractPollUrl\\(created\\)/);
  assert.match(browser,/Core\\?\\.extractPollUrl\\?Core\\.extractPollUrl\\(createdRaw\\)/);
  assert.match(server,/if\\(config\\.strictPollPath===true\\)return''/);""",
'parity test verifies shared core use')

core_path.write_text(core,encoding='utf-8')
browser_path.write_text(browser,encoding='utf-8')
server_path.write_text(server,encoding='utf-8')
core_test_path.write_text(core_test,encoding='utf-8')
parity_test_path.write_text(parity_test,encoding='utf-8')
print('moved async poll URL shape knowledge into shared provider runtime core')
