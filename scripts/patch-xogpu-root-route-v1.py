from pathlib import Path

root = Path('_read_123_zip_20260821_180410')
registry = root / 'video-protocol-registry.js'
index = root / 'index.html'
test_file = root / 'tests' / 'xogpu-root-route-v1.test.mjs'

src = registry.read_text(encoding='utf-8')
old = """  const base=genericProfile('xogpu-minimax-h3'),media=operation!=='text-to-video';\n  return{...base,profile:'xogpu:minimax-h3',createPath:media?'/api/user/discount-video-studio/jobs':'/v1/videos',createCandidates:[media?'/api/user/discount-video-studio/jobs':'/v1/videos'],pollPath:'/v1/videos/{{taskId}}',pollPathCandidates:['/v1/videos/{{taskId}}','/api/user/discount-video-studio/jobs/{{taskId}}'],strictPollPath:true,strictCreatePath:true,taskIdPath:'id',taskIdPaths:['id','task_id','taskId',...COMMON_TASK_IDS],statusPath:'status',statusPaths:['status',...COMMON_STATUS],progressPath:'progress',progressPaths:['progress',...COMMON_PROGRESS],outputPath:'',outputPaths:[],contentPath:'/v1/videos/{{taskId}}/content',contentPathCandidates:['/v1/videos/{{taskId}}/content'],requestTransport:media?'multipart':'json',strictMediaTransport:media,noJsonFallback:media,referenceTransport:'auto',allowOutputWithoutTerminalStatus:false,pollIntervalMs:15000,timeoutMs:3600000,videoOperation:operation};\n"""
new = """  const base=genericProfile('xogpu-minimax-h3'),media=operation!=='text-to-video';\n  const rootPath=value=>{try{return new URL(String(provider?.baseUrl||'')).origin+String(value||'')}catch{return String(value||'')}};\n  const studioJobs=rootPath('/api/user/discount-video-studio/jobs'),studioJobPoll=rootPath('/api/user/discount-video-studio/jobs/{{taskId}}');\n  return{...base,profile:'xogpu:minimax-h3',createPath:media?studioJobs:'/v1/videos',createCandidates:[media?studioJobs:'/v1/videos'],pollPath:'/v1/videos/{{taskId}}',pollPathCandidates:['/v1/videos/{{taskId}}',studioJobPoll],strictPollPath:true,strictCreatePath:true,taskIdPath:'id',taskIdPaths:['id','task_id','taskId',...COMMON_TASK_IDS],statusPath:'status',statusPaths:['status',...COMMON_STATUS],progressPath:'progress',progressPaths:['progress',...COMMON_PROGRESS],outputPath:'',outputPaths:[],contentPath:'/v1/videos/{{taskId}}/content',contentPathCandidates:['/v1/videos/{{taskId}}/content'],requestTransport:media?'multipart':'json',strictMediaTransport:media,noJsonFallback:media,referenceTransport:'auto',allowOutputWithoutTerminalStatus:false,pollIntervalMs:15000,timeoutMs:3600000,videoOperation:operation};\n"""
if old not in src:
    if "const studioJobs=rootPath('/api/user/discount-video-studio/jobs')" not in src:
        raise SystemExit('XOGPU profile anchor not found')
else:
    src = src.replace(old, new, 1)
    registry.write_text(src, encoding='utf-8')

html = index.read_text(encoding='utf-8')
old_cache = './video-protocol-registry.js?v=20260902-xogpu-working-envelope-1'
new_cache = './video-protocol-registry.js?v=20260909-xogpu-root-route-1'
if old_cache in html:
    html = html.replace(old_cache, new_cache, 1)
elif new_cache not in html:
    raise SystemExit('video protocol cache key anchor not found')
index.write_text(html, encoding='utf-8')

test_file.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');
const sandbox={URL,globalThis:{}};
vm.runInNewContext(src,sandbox,{filename:'video-protocol-registry.js'});
const Registry=sandbox.globalThis.CanvasVideoProtocolRegistry;

test('XOGPU MiniMax-H3 discount media create route is origin-root even when Base URL ends in /v1',()=>{
  const provider={baseUrl:'https://xogpu.com/v1'};
  const model={id:'MiniMax-H3',name:'MiniMax-H3'};
  const route=Registry.resolve(provider,model,'image-to-video');
  assert.equal(route.createPath,'https://xogpu.com/api/user/discount-video-studio/jobs');
  assert.deepEqual(Array.from(route.createCandidates),['https://xogpu.com/api/user/discount-video-studio/jobs']);
  assert.ok(Array.from(route.pollPathCandidates).includes('https://xogpu.com/api/user/discount-video-studio/jobs/{{taskId}}'));
  assert.equal(route.createPath.includes('/v1/api/'),false);
});

test('XOGPU text-to-video keeps the normal /v1/videos route',()=>{
  const route=Registry.resolve({baseUrl:'https://xogpu.com/v1'},{id:'MiniMax-H3',name:'MiniMax-H3'},'text-to-video');
  assert.equal(route.createPath,'/v1/videos');
});

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('browser cache key is bumped for corrected XOGPU protocol registry',()=>{
  assert.match(html,/video-protocol-registry\.js\?v=20260909-xogpu-root-route-1/);
});
""", encoding='utf-8')
