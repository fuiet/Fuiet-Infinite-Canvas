import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { URL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dns from 'node:dns/promises';
import net from 'node:net';
import os from 'node:os';
import { CanvasStore } from './store.js';
const execFileAsync = promisify(execFile);
const __dirname = path.dirname(process.argv[1] || process.cwd());

const ROOT = __dirname;
const DATA_DIR = process.env.CANVAS_DATA_DIR || path.join(os.tmpdir(), 'canvas-studio-provider-workbench');
const PROVIDERS_FILE = path.join(DATA_DIR, 'providers.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
const BLENDER_TOKEN_FILE = path.join(DATA_DIR, 'blender-bridge.token');
const BLENDER_STATE_FILE = path.join(DATA_DIR, 'blender-bridge.json');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const PORT = Number(process.env.PORT || 8080);
const MAX_UPLOAD_BYTES = Math.max(10*1024*1024, Number(process.env.CANVAS_MAX_UPLOAD_BYTES || 100*1024*1024));
const TASK_CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.CANVAS_TASK_CONCURRENCY || 2)));
let taskQueuePaused=false;
const ADMIN_PASSWORD = String(process.env.CANVAS_ADMIN_PASSWORD || '');
const HOST = String(process.env.HOST || process.env.CANVAS_HOST || (ADMIN_PASSWORD ? '0.0.0.0' : '127.0.0.1'));
const TRUST_PROXY = process.env.CANVAS_TRUST_PROXY === '1';
const SESSION_TTL_MS = Math.max(60*60*1000, Number(process.env.CANVAS_SESSION_TTL_MS || 24*60*60*1000));
const ALLOW_CORS = process.env.CANVAS_ALLOW_CORS === '1';
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';
const MAGICK_BIN = process.env.MAGICK_PATH || 'magick';
const FFPROBE_BIN = process.env.FFPROBE_PATH || 'ffprobe';
let store;
let MASTER_KEY;
let bootPromise;
async function ensureBoot() {
  if (!bootPromise) {
    bootPromise = (async () => {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
      await fs.promises.mkdir(MEDIA_DIR, { recursive: true });
      try { await fs.promises.access(PROVIDERS_FILE); } catch { await fs.promises.writeFile(PROVIDERS_FILE, '[]\n'); }
      try { await fs.promises.access(SECRET_FILE); } catch { await fs.promises.writeFile(SECRET_FILE, crypto.randomBytes(32)); }
      try { await fs.promises.access(BLENDER_TOKEN_FILE); } catch { await fs.promises.writeFile(BLENDER_TOKEN_FILE, crypto.randomBytes(24).toString('hex')); }
      try { await fs.promises.access(BLENDER_STATE_FILE); } catch { await fs.promises.writeFile(BLENDER_STATE_FILE, JSON.stringify({canvas_to_blender:null,blender_to_canvas:null},null,2)); }
      MASTER_KEY = await fs.promises.readFile(SECRET_FILE);
      store = new CanvasStore(DATA_DIR);
    })();
  }
  return bootPromise;
}
let runningTasks = 0;
const rateBuckets = new Map();

function json(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length,
    'Cache-Control': 'no-store'
  });
  res.end(data);
}


function requestIp(req){ return String((TRUST_PROXY&&req.headers['x-forwarded-for'])||req.socket.remoteAddress||'unknown').split(',')[0].trim(); }
function enforceRateLimit(req,res){
  if(!req.url.startsWith('/api/')) return true;
  const key=requestIp(req), now=Date.now(), win=60_000;
  let b=rateBuckets.get(key); if(!b||now-b.start>win)b={start:now,count:0,uploads:0};
  b.count++; if(req.url.startsWith('/api/upload'))b.uploads++; rateBuckets.set(key,b);
  const limit=req.url.startsWith('/api/upload')?35:300;
  const count=req.url.startsWith('/api/upload')?b.uploads:b.count;
  if(count>limit){json(res,429,{error:'请求过于频繁，请稍后重试'});return false;} return true;
}
function parseCookies(req){const out={};for(const part of String(req.headers.cookie||'').split(';')){const i=part.indexOf('=');if(i>0)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim())}return out}
function signSession(exp){
  const payload=Buffer.from(JSON.stringify({exp,nonce:crypto.randomBytes(10).toString('hex')})).toString('base64url');
  const sig=crypto.createHmac('sha256',MASTER_KEY).update(payload).digest('base64url'); return `${payload}.${sig}`;
}
function verifySession(token){
  try{const [payload,sig]=String(token||'').split('.');if(!payload||!sig)return false;const expected=crypto.createHmac('sha256',MASTER_KEY).update(payload).digest('base64url');if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return false;const x=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));return Number(x.exp)>Date.now()}catch{return false}
}
function authRequired(req,pathname){
  if(pathname==='/api/blender/bridge/push'||pathname==='/api/blender/bridge/poll')return false;
  if(!ADMIN_PASSWORD)return false;
  if(pathname==='/api/health'||pathname.startsWith('/api/auth/'))return false;
  return pathname.startsWith('/api/');
}
function blenderBridgeToken(){return String(fs.readFileSync(BLENDER_TOKEN_FILE,'utf8')).trim()}
function blenderBridgeAuthorized(req,u){const token=String(req.headers['x-canvas-bridge-token']||u?.searchParams?.get('token')||'');const expected=blenderBridgeToken();if(!token||token.length!==expected.length)return false;try{return crypto.timingSafeEqual(Buffer.from(token),Buffer.from(expected))}catch{return false}}
function readBlenderBridgeState(){try{return JSON.parse(fs.readFileSync(BLENDER_STATE_FILE,'utf8'))}catch{return{canvas_to_blender:null,blender_to_canvas:null}}}
function writeBlenderBridgeState(x){fs.writeFileSync(BLENDER_STATE_FILE,JSON.stringify(x,null,2))}
function checkSameOrigin(req){
  if(ALLOW_CORS || ['GET','HEAD','OPTIONS'].includes(req.method))return true;
  const origin=String(req.headers.origin||'');if(!origin)return true;
  try{const u=new URL(origin);return u.host===String(req.headers.host||'')}catch{return false}
}
function isPrivateIp(ip){
  if(net.isIPv4(ip)){
    const p=ip.split('.').map(Number);
    return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)||p[0]>=224;
  }
  if(net.isIPv6(ip)){const x=ip.toLowerCase();return x==='::1'||x==='::'||x.startsWith('fc')||x.startsWith('fd')||x.startsWith('fe80:')||x.startsWith('::ffff:127.')||x.startsWith('::ffff:10.')||x.startsWith('::ffff:192.168.');}
  return true;
}
async function validateOutboundUrl(urlText,provider={}){
  let u;try{u=new URL(String(urlText))}catch{throw new Error('供应商 URL 无效')}
  if(!['http:','https:'].includes(u.protocol))throw new Error('仅允许 HTTP/HTTPS 供应商');
  const host=u.hostname.toLowerCase();
  if(provider.allowPrivateHosts)return u.toString();
  if(host==='localhost'||host.endsWith('.localhost'))throw new Error('安全策略阻止访问本机地址；如确需连接本地 ComfyUI，请在供应商高级设置开启「允许私有网络」');
  const ips=net.isIP(host)?[{address:host}]:await dns.lookup(host,{all:true,verbatim:true});
  if(!ips.length||ips.some(x=>isPrivateIp(x.address)))throw new Error('安全策略阻止访问私有/保留网络地址');
  return u.toString();
}
async function fetchSafe(url,options={},provider={}){
  let current=await validateOutboundUrl(url,provider);
  for(let i=0;i<4;i++){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),options.timeoutMs||60000);
    try{
      const res=await fetch(current,{...options,signal:controller.signal,redirect:'manual',timeoutMs:undefined});
      if([301,302,303,307,308].includes(res.status)&&res.headers.get('location')){
        const next=new URL(res.headers.get('location'),current).toString();current=await validateOutboundUrl(next,provider);continue;
      }
      return res;
    }finally{clearTimeout(timeout)}
  }
  throw new Error('上游重定向次数过多');
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 5 * 1024 * 1024) throw new Error('请求体过大');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}


async function readRaw(req, maxBytes=MAX_UPLOAD_BYTES) {
  const chunks=[]; let size=0;
  for await (const c of req) { size+=c.length; if(size>maxBytes) throw new Error('上传文件过大'); chunks.push(c); }
  return Buffer.concat(chunks);
}
async function writeUpload(req, file, maxBytes=MAX_UPLOAD_BYTES) {
  let size=0;
  const ws=fs.createWriteStream(file,{flags:'wx'});
  try{
    for await (const c of req) {
      size+=c.length;
      if(size>maxBytes) throw new Error('上传文件过大');
      if(!ws.write(c)) await new Promise((resolve,reject)=>{ws.once('drain',resolve);ws.once('error',reject)});
    }
    await new Promise((resolve,reject)=>ws.end(err=>err?reject(err):resolve()));
    return size;
  }catch(err){
    ws.destroy();
    try{fs.unlinkSync(file)}catch{}
    throw err;
  }
}
function safeExt(name='', mime='') {
  const ext=path.extname(String(name)).toLowerCase().replace(/[^.a-z0-9]/g,'');
  if(ext && ext.length<=8) return ext;
  const map={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','video/mp4':'.mp4','video/quicktime':'.mov','audio/mpeg':'.mp3','audio/wav':'.wav','audio/x-wav':'.wav','audio/mp4':'.m4a','audio/aac':'.aac','model/gltf-binary':'.glb','model/gltf+json':'.gltf'};
  return map[mime]||'.bin';
}
function mediaPathFromUrl(urlText) {
  const t=String(urlText||'');
  const m=t.match(/^\/media\/([A-Za-z0-9._-]+)$/);
  if(!m) throw new Error('本地处理仅支持通过画布上传到服务器的素材');
  const file=path.join(MEDIA_DIR,m[1]);
  if(!file.startsWith(MEDIA_DIR) || !fs.existsSync(file)) throw new Error('本地素材不存在');
  return file;
}
function mediaUrl(file){ return '/media/'+path.basename(file); }
function outFile(ext){ return path.join(MEDIA_DIR, uid('media_') + ext); }
async function runCmd(cmd,args,timeout=20*60*1000){
  try { return await execFileAsync(cmd,args,{timeout,maxBuffer:8*1024*1024}); }
  catch(err){ throw new Error(`${path.basename(cmd)} 处理失败：${String(err.stderr||err.message).slice(-1200)}`); }
}
function ratioToNumbers(ratio='16:9'){const m=String(ratio).match(/(\d+(?:\.\d+)?)[/:](\d+(?:\.\d+)?)/);return m?[Number(m[1]),Number(m[2])]:[16,9]}

async function probeMediaFile(file){
  const out=await runCmd(FFPROBE_BIN,['-v','error','-show_entries','format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels','-of','json',file],30000);
  const data=JSON.parse(String(out.stdout||'{}')); const streams=data.streams||[];
  const video=streams.find(x=>x.codec_type==='video'),audio=streams.find(x=>x.codec_type==='audio');
  return {duration:Number(data.format?.duration||0),video:video?{codec:video.codec_name,width:Number(video.width||0),height:Number(video.height||0),fps:video.r_frame_rate||''}:null,audio:audio?{codec:audio.codec_name,sampleRate:Number(audio.sample_rate||0),channels:Number(audio.channels||0)}:null};
}
function resolutionSize(v='720p'){const m=String(v).toLowerCase();if(m.includes('1440'))return[2560,1440];if(m.includes('1080'))return[1920,1080];if(m.includes('480'))return[854,480];return[1280,720]}
function atempoChain(speed){let s=Math.max(.1,Math.min(8,Number(speed||1))),parts=[];while(s>2.0001){parts.push('atempo=2');s/=2}while(s<.4999){parts.push('atempo=0.5');s*=2}if(Math.abs(s-1)>.001)parts.push(`atempo=${s.toFixed(5)}`);return parts.join(',')}
function volumeEnvelopeExpression(keys,base=1){const pts=(Array.isArray(keys)?keys:[]).map(k=>({t:Math.max(0,Number(k.t||0)),v:Math.max(0,Math.min(4,Number(k.v??base)))})).sort((a,b)=>a.t-b.t);if(!pts.length)return String(Math.max(0,Math.min(4,Number(base??1))).toFixed(5));if(pts.length===1)return String(pts[0].v.toFixed(5));let expr=String(pts.at(-1).v.toFixed(5));for(let i=pts.length-2;i>=0;i--){const a=pts[i],b=pts[i+1],dt=Math.max(.001,b.t-a.t),seg=`${a.v.toFixed(5)}+(${(b.v-a.v).toFixed(5)})*(t-${a.t.toFixed(5)})/${dt.toFixed(5)}`;expr=`if(lt(t,${a.t.toFixed(5)}),${a.v.toFixed(5)},if(lt(t,${b.t.toFixed(5)}),${seg},${expr}))`}return expr}
function assTime(sec){sec=Math.max(0,Number(sec||0));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),ss=Math.floor(sec%60),cs=Math.round((sec-Math.floor(sec))*100);return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}.${String(cs).padStart(2,'0')}`}
function assColor(hex='#ffffff'){const x=String(hex||'#ffffff').replace('#','').padEnd(6,'f').slice(0,6);return `&H00${x.slice(4,6)}${x.slice(2,4)}${x.slice(0,2)}`.toUpperCase()}
function assEscape(text){return String(text||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\N').replace(/[{}]/g,'')}
function makeAssFile(subtitles,style,W,H){const fontSize=Math.max(14,Math.min(96,Number(style?.fontSize||42))),outline=Math.max(0,Math.min(8,Number(style?.outline||2))),bottom=Math.max(10,Math.min(H-20,Number(style?.bottom||72))),color=assColor(style?.color||'#ffffff');const rows=(Array.isArray(subtitles)?subtitles:[]).filter(x=>String(x.text||'').trim()&&Number(x.end)>Number(x.start)).map(x=>`Dialogue: 0,${assTime(x.start)},${assTime(x.end)},Default,,0,0,0,,${assEscape(x.text)}`).join('\n');if(!rows)return '';const file=path.join(DATA_DIR,uid('subtitle_')+'.ass');const content=`[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Noto Sans CJK SC,${fontSize},${color},${color},&HCC000000,&H66000000,0,0,0,0,100,100,0,0,1,${outline},0,2,40,40,${bottom},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${rows}\n`;fs.writeFileSync(file,content);return file}
async function composeTimeline(p){const clips=Array.isArray(p.clips)?p.clips:[];if(!clips.length)throw new Error('时间轴没有素材');const local=[];for(const c of clips){const file=mediaPathFromUrl(c.url),meta=await probeMediaFile(file);local.push({...c,file,meta,type:c.type||(meta.video?'video':'audio'),speed:Math.max(.1,Math.min(8,Number(c.speed||1)))})}const clipEnd=c=>Number(c.start||0)+Math.max(.01,(Number(c.out??c.meta.duration)-Number(c.in||0))/c.speed),total=Math.max(.1,Number(p.duration)||Math.max(...local.map(clipEnd))),[W,H]=resolutionSize(p.resolution||'720p'),args=['-y'];local.forEach(c=>args.push('-i',c.file));const filters=[`color=c=black:s=${W}x${H}:d=${total}[base0]`];let base='base0',ov=0;const audioLabels=[];local.forEach((c,i)=>{const start=Math.max(0,Number(c.start||0)),tin=Math.max(0,Number(c.in||0)),sourceDur=Math.max(.01,Number(c.out??c.meta.duration)-tin),timelineDur=Math.min(sourceDur/c.speed,Math.max(.01,total-start));if(c.meta.video){const v=`v${i}`,tr=String(c.transitionIn||'none'),td=Math.max(.05,Math.min(2,Number(c.transitionDuration||.45)));let vf=`[${i}:v]trim=start=${tin}:duration=${Math.min(sourceDur,timelineDur*c.speed)},setpts=(PTS-STARTPTS)/${c.speed}+${start}/TB,scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black@0`;if(['fade','dissolve'].includes(tr))vf+=`,format=yuva420p,fade=t=in:st=${start}:d=${Math.min(td,timelineDur).toFixed(3)}:alpha=1`;vf+=`[${v}]`;filters.push(vf);const next=`base${++ov}`;let x='0';if(tr==='slideleft')x=`if(lt(t\\,${(start+td).toFixed(3)})\\,W*(1-(t-${start.toFixed(3)})/${td.toFixed(3)})\\,0)`;if(tr==='slideright')x=`if(lt(t\\,${(start+td).toFixed(3)})\\,-W*(1-(t-${start.toFixed(3)})/${td.toFixed(3)})\\,0)`;filters.push(`[${base}][${v}]overlay=x='${x}':y=0:eof_action=pass:enable='between(t,${start},${start+timelineDur})'[${next}]`);base=next}if(c.meta.audio&&c.muted!==true){const vol=Math.max(0,Math.min(4,Number(c.volume??1))),delay=Math.round(start*1000),a=`a${i}`,tempo=atempoChain(c.speed),env=volumeEnvelopeExpression(c.volumeKeyframes,vol);filters.push(`[${i}:a]atrim=start=${tin}:duration=${Math.min(sourceDur,timelineDur*c.speed)},asetpts=PTS-STARTPTS${tempo?','+tempo:''},volume='${env}':eval=frame,adelay=${delay}|${delay}[${a}]`);audioLabels.push(`[${a}]`)}});const grade={brightness:0,contrast:1,saturation:1,gamma:1,temperature:0,...(p.grade||{})},brightness=Math.max(-1,Math.min(1,Number(grade.brightness||0))),contrast=Math.max(.1,Math.min(3,Number(grade.contrast||1))),sat=Math.max(0,Math.min(3,Number(grade.saturation||1))),gamma=Math.max(.1,Math.min(4,Number(grade.gamma||1))),temp=Math.max(-1,Math.min(1,Number(grade.temperature||0)));let finalVideo=base;const graded=`base${++ov}`;filters.push(`[${finalVideo}]eq=brightness=${brightness.toFixed(4)}:contrast=${contrast.toFixed(4)}:saturation=${sat.toFixed(4)}:gamma=${gamma.toFixed(4)}${Math.abs(temp)>.001?`,colorbalance=rs=${(temp*.16).toFixed(4)}:bs=${(-temp*.16).toFixed(4)}`:''}[${graded}]`);finalVideo=graded;let assFile='';try{assFile=makeAssFile(p.subtitles,p.subtitleStyle,W,H);if(assFile){const subbed=`base${++ov}`,escaped=assFile.replace(/\\/g,'/').replace(/:/g,'\\:').replace(/'/g,"\\'");filters.push(`[${finalVideo}]ass=filename='${escaped}'[${subbed}]`);finalVideo=subbed}let audioOut='';if(audioLabels.length){audioOut='aout';filters.push(`${audioLabels.join('')}amix=inputs=${audioLabels.length}:duration=longest:dropout_transition=1,atrim=duration=${total}[aout]`)}const out=outFile('.mp4');args.push('-filter_complex',filters.join(';'),'-map',`[${finalVideo}]`);if(audioOut)args.push('-map','[aout]');else args.push('-an');args.push('-t',String(total),'-c:v','libx264','-preset','veryfast','-crf','20');if(audioOut)args.push('-c:a','aac','-b:a','192k');args.push('-movflags','+faststart',out);await runCmd(FFMPEG_BIN,args);return{outputs:[{type:'video',url:mediaUrl(out),duration:total}],duration:total}}finally{if(assFile)try{fs.unlinkSync(assFile)}catch{}}}

async function processLocalMedia(body){
  const op=String(body.operation||'');
  const source=mediaPathFromUrl(body.sourceUrl);
  const ext=path.extname(source).toLowerCase();
  const p=body.params||{};
  if(op==='media-probe'){
    return {meta:await probeMediaFile(source)};
  }
  if(op==='image-crop'){
    const info=await runCmd(MAGICK_BIN,['identify','-format','%w,%h',source],30000);const [w,h]=String(info.stdout||'').trim().split(',').map(Number);
    if(!(w>0&&h>0))throw new Error('无法读取图片尺寸');
    const norm=p.normalized!==false;let x=Number(p.x||0),y=Number(p.y||0),cw=Number(p.width||w),ch=Number(p.height||h);
    if(norm){x=Math.round(x*w);y=Math.round(y*h);cw=Math.round(cw*w);ch=Math.round(ch*h)}
    x=Math.max(0,Math.min(w-1,Math.round(x)));y=Math.max(0,Math.min(h-1,Math.round(y)));cw=Math.max(1,Math.min(w-x,Math.round(cw)));ch=Math.max(1,Math.min(h-y,Math.round(ch)));
    const out=outFile(ext||'.png');await runCmd(MAGICK_BIN,[source,'-crop',`${cw}x${ch}+${x}+${y}`,'+repage',out],120000);return {outputs:[{type:'image',url:mediaUrl(out),crop:{x,y,width:cw,height:ch}}]};
  }
  if(op==='image-stitch'){
    const urls=[body.sourceUrl,...(p.urls||[])].filter(Boolean);const files=urls.map(mediaPathFromUrl);if(!files.length)throw new Error('没有可拼接图片');
    const cols=Math.max(1,Number(p.cols||Math.ceil(Math.sqrt(files.length)))),rows=Math.ceil(files.length/cols);const target=String(p.resolution||'2K').toUpperCase()==='4K'?4096:2048;
    const cellW=Math.floor(target/cols),cellH=Math.max(1,Math.floor(target*9/16/rows));const out=outFile('.jpg');
    const args=[...files,'-thumbnail',`${cellW}x${cellH}^`,'-gravity','center','-extent',`${cellW}x${cellH}`,'-tile',`${cols}x${rows}`,'-geometry','+0+0','-background','#111111'];
    if(p.numbered)args.push('-pointsize','28');args.push('montage:'+out);
    // ImageMagick 7 supports montage subcommand separately more reliably.
    const montageArgs=[...files,'-thumbnail',`${cellW}x${cellH}^`,'-gravity','center','-extent',`${cellW}x${cellH}`,'-tile',`${cols}x${rows}`,'-geometry','+0+0','-background','#111111',out];
    await runCmd(MAGICK_BIN,['montage',...montageArgs],240000);return {outputs:[{type:'image',url:mediaUrl(out),cols,rows}]};
  }
  if(op==='video-compose-timeline'){
    return await composeTimeline(p);
  }
  if(op==='image-transform'){
    const out=outFile(ext||'.png'); const args=[source];
    if(Number(p.rotation)) args.push('-rotate',String(Number(p.rotation)));
    if(p.mirrorX) args.push('-flop'); if(p.mirrorY) args.push('-flip');
    if(p.cropRatio){const [rw,rh]=ratioToNumbers(p.cropRatio);const info=await runCmd(MAGICK_BIN,['identify','-format','%w,%h',source],30000);const [w,h]=String(info.stdout||'').trim().split(',').map(Number);if(w>0&&h>0){let cw=w,ch=Math.round(w*rh/rw);if(ch>h){ch=h;cw=Math.round(h*rw/rh)}args.push('-gravity','center','-crop',`${cw}x${ch}+0+0`,'+repage');}}
    args.push(out); await runCmd(MAGICK_BIN,args,120000); return {outputs:[{type:'image',url:mediaUrl(out)}]};
  }
  if(op==='image-relight'){
    const intensity=Math.max(0,Math.min(100,Number(p.intensity??50))),temperature=Math.max(2800,Math.min(9000,Number(p.temperature??5600))),softness=Math.max(0,Math.min(100,Number(p.softness??50))),rim=Math.max(0,Math.min(100,Number(p.rim??0)));
    const brightness=Math.round((intensity-50)*0.34),contrast=Math.round((50-softness)*0.18),warm=(temperature-5600)/3400;
    const out=outFile(ext||'.png'),args=[source,'-brightness-contrast',`${brightness}x${contrast}`];
    if(Math.abs(warm)>.02){const color=warm>0?'#ffb46b':'#79a8ff',amount=Math.round(Math.min(12,Math.abs(warm)*10));args.push('-fill',color,'-colorize',`${amount}%`)}
    if(rim>5)args.push('-sharpen',`0x${(0.3+rim/100).toFixed(2)}`);
    args.push(out);await runCmd(MAGICK_BIN,args,120000);return{outputs:[{type:'image',url:mediaUrl(out),relight:{intensity,temperature,softness,rim}}]};
  }
  if(op==='image-upscale'){
    const scale=Math.max(1,Math.min(6,Number(p.scale||2)));const out=outFile(ext||'.png');
    await runCmd(MAGICK_BIN,[source,'-filter','Lanczos','-resize',`${scale*100}%`,out],180000);
    return {outputs:[{type:'image',url:mediaUrl(out),scale}]};
  }
  if(op==='image-grid-split'){
    const total=Number(p.grid||9), side=total===25?5:3, selected=(Array.isArray(p.selected)?p.selected:Array.from({length:total},(_,i)=>i)).map(Number).filter(i=>i>=0&&i<total);
    const info=await runCmd(MAGICK_BIN,['identify','-format','%w,%h',source],30000);const [w,h]=String(info.stdout||'').trim().split(',').map(Number);
    if(!(w>0&&h>0))throw new Error('无法读取图片尺寸');const cw=Math.floor(w/side),ch=Math.floor(h/side);const outputs=[];
    for(const idx of selected){const col=idx%side,row=Math.floor(idx/side),out=outFile(ext||'.png');await runCmd(MAGICK_BIN,[source,'-crop',`${cw}x${ch}+${col*cw}+${row*ch}`,'+repage',out],120000);outputs.push({type:'image',url:mediaUrl(out),index:idx});}
    return {outputs,grid:total};
  }
  if(op==='video-frames'){
    const count=Math.max(1,Math.min(12,Number(p.count||4)));const probe=await runCmd(FFPROBE_BIN,['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',source],30000);const duration=Math.max(.1,Number(String(probe.stdout||'').trim())||Number(p.duration||5));const outputs=[];
    for(let i=0;i<count;i++){const t=Math.min(Math.max(0,duration-.04),duration*(i+.5)/count),out=outFile('.jpg');await runCmd(FFMPEG_BIN,['-y','-ss',String(t),'-i',source,'-frames:v','1','-q:v','2',out],120000);outputs.push({type:'image',url:mediaUrl(out),time:t});}
    return {outputs,duration};
  }
  if(op==='video-frame-at'){
    const probe=await runCmd(FFPROBE_BIN,['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',source],30000);const duration=Math.max(.1,Number(String(probe.stdout||'').trim())||5),t=Math.max(0,Math.min(duration-.001,Number(p.time||0))),out=outFile('.jpg');
    await runCmd(FFMPEG_BIN,['-y','-ss',String(t),'-i',source,'-frames:v','1','-q:v','2',out],120000);return {outputs:[{type:'image',url:mediaUrl(out),time:t}],duration};
  }
  if(op==='video-trim'){
    const out=outFile('.mp4'); const a=Math.max(0,Number(p.in||0)), b=Math.max(a+.01,Number(p.out||a+5));
    await runCmd(FFMPEG_BIN,['-y','-ss',String(a),'-to',String(b),'-i',source,'-c:v','libx264','-preset','veryfast','-crf','20','-c:a','aac','-movflags','+faststart',out]);
    return {outputs:[{type:'video',url:mediaUrl(out),duration:b-a}]};
  }
  if(op==='video-reframe'){
    const meta=await probeMediaFile(source);if(!meta.video)throw new Error('源素材没有视频轨');const [rw,rh]=ratioToNumbers(p.aspectRatio||'9:16'),ratio=rw/rh,w=meta.video.width,h=meta.video.height,focusX=Math.max(0,Math.min(1,Number(p.focusX??.5))),focusY=Math.max(0,Math.min(1,Number(p.focusY??.5)));let cw=w,ch=h,x=0,y=0;
    if(w/h>ratio){cw=Math.max(2,Math.floor(h*ratio/2)*2);x=Math.max(0,Math.min(w-cw,Math.round((w-cw)*focusX)))}else{ch=Math.max(2,Math.floor((w/ratio)/2)*2);y=Math.max(0,Math.min(h-ch,Math.round((h-ch)*focusY)))}
    const out=outFile('.mp4'),args=['-y','-i',source,'-vf',`crop=${cw}:${ch}:${x}:${y}`,'-map','0:v:0','-map','0:a?','-c:v','libx264','-preset','veryfast','-crf','20','-c:a','aac','-movflags','+faststart',out];await runCmd(FFMPEG_BIN,args);return{outputs:[{type:'video',url:mediaUrl(out),duration:meta.duration,aspectRatio:p.aspectRatio||'9:16',crop:{x,y,width:cw,height:ch}}]};
  }
  if(op==='video-speed'){
    const meta=await probeMediaFile(source);if(!meta.video)throw new Error('源素材没有视频轨');const speed=Math.max(.25,Math.min(4,Number(p.speed||1))),out=outFile('.mp4'),args=['-y','-i',source,'-filter:v',`setpts=PTS/${speed}`];if(meta.audio){const keepPitch=p.preservePitch!==false,tempo=keepPitch?atempoChain(speed):`asetrate=${Math.max(8000,Number(meta.audio.sampleRate||48000))*speed},aresample=${Math.max(8000,Number(meta.audio.sampleRate||48000))}`;if(tempo)args.push('-filter:a',tempo);args.push('-map','0:v:0','-map','0:a:0')}else args.push('-map','0:v:0','-an');args.push('-c:v','libx264','-preset','veryfast','-crf','20');if(meta.audio)args.push('-c:a','aac','-b:a','192k');args.push('-movflags','+faststart',out);await runCmd(FFMPEG_BIN,args);return{outputs:[{type:'video',url:mediaUrl(out),duration:meta.duration/speed,speed,preservePitch:p.preservePitch!==false}]};
  }
  if(op==='video-freeze'){
    const meta=await probeMediaFile(source);if(!meta.video)throw new Error('源素材没有视频轨');
    const fpsRaw=String(meta.video.fps||'30'),fpsParts=fpsRaw.split('/').map(Number),fps=(fpsParts.length===2&&fpsParts[1]?fpsParts[0]/fpsParts[1]:Number(fpsRaw))||30;
    const hold=Math.max(.1,Math.min(10,Number(p.holdDuration||1.5))),eps=Math.max(.001,1/Math.max(1,fps)),t=Math.max(eps,Math.min(Math.max(eps,meta.duration-eps),Number(p.time||0))),out=outFile('.mp4');
    // Freeze by creating a timestamp gap at the selected frame. CFR encoding duplicates the
    // last frame before the gap for `hold` seconds, then the original timeline continues.
    // This avoids the duration loss / off-by-one-frame behavior of trim+tpad+concat.
    const filters=[`[0:v]setpts='if(gte(T,${t.toFixed(6)}),PTS+${hold.toFixed(6)}/TB,PTS)'[vout]`];
    const hasAudio=Boolean(meta.audio);
    if(hasAudio){
      filters.push(
        `[0:a]asplit=2[apre0][apost0]`,
        `[apre0]atrim=start=0:end=${t.toFixed(6)},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo[apre]`,
        `anullsrc=r=48000:cl=stereo,atrim=duration=${hold.toFixed(6)},asetpts=PTS-STARTPTS[asil]`,
        `[apost0]atrim=start=${t.toFixed(6)},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo[apost]`,
        `[apre][asil][apost]concat=n=3:v=0:a=1[aout]`
      );
    }
    const args=['-y','-i',source,'-filter_complex',filters.join(';'),'-map','[vout]'];
    if(hasAudio)args.push('-map','[aout]');else args.push('-an');
    args.push('-fps_mode','cfr','-r',String(fps),'-c:v','libx264','-preset','veryfast','-crf','20');
    if(hasAudio)args.push('-c:a','aac','-b:a','192k');
    args.push('-movflags','+faststart',out);
    await runCmd(FFMPEG_BIN,args);
    const actual=await probeMediaFile(out);
    return{outputs:[{type:'video',url:mediaUrl(out),duration:actual.duration||meta.duration+hold,freezeAt:t,holdDuration:hold,audioMode:'silence'}]};
  }
  if(op==='video-hd'){
    const out=outFile('.mp4'),scale=Math.max(1,Math.min(6,Number(p.scale||2))),fps=[30,60,90].includes(Number(p.fps))?Number(p.fps):30,slow=Math.max(0,Math.min(100,Number(p.slowMotion||0)));
    const factor=1+slow/100*2; const vf=`scale=iw*${scale}:ih*${scale}:flags=lanczos,fps=${fps}${factor>1?`,setpts=${factor}*PTS`:''}`;const args=['-y','-i',source,'-vf',vf];
    if(factor>1) args.push('-af',`atempo=${Math.max(.5,1/factor)}`);args.push('-c:v','libx264','-preset','veryfast','-crf','20','-c:a','aac','-movflags','+faststart',out);await runCmd(FFMPEG_BIN,args);return {outputs:[{type:'video',url:mediaUrl(out)}]};
  }
  if(op==='av-separate'){
    const v=outFile('.mp4'),a=outFile('.m4a');await runCmd(FFMPEG_BIN,['-y','-i',source,'-an','-c:v','copy',v]);await runCmd(FFMPEG_BIN,['-y','-i',source,'-vn','-c:a','aac',a]);return {outputs:[{type:'video',url:mediaUrl(v)},{type:'audio',url:mediaUrl(a)}]};
  }
  if(op==='audio-trim'){
    const out=outFile(ext&&ext!=='.bin'?ext:'.m4a'),a=Math.max(0,Number(p.in||0)),b=Math.max(a+.01,Number(p.out||a+10));await runCmd(FFMPEG_BIN,['-y','-ss',String(a),'-to',String(b),'-i',source,'-c:a','aac',out]);return {outputs:[{type:'audio',url:mediaUrl(out),duration:b-a}]};
  }
  if(op==='audio-speed'){
    const out=outFile('.m4a'),speed=Math.max(.25,Math.min(2,Number(p.speed||1)));let filters=[];let left=speed;while(left>2){filters.push('atempo=2');left/=2}while(left<.5){filters.push('atempo=.5');left*=2}filters.push(`atempo=${left}`);await runCmd(FFMPEG_BIN,['-y','-i',source,'-filter:a',filters.join(','),'-c:a','aac',out]);return {outputs:[{type:'audio',url:mediaUrl(out)}]};
  }
  if(op==='video-compose'){
    const urls=[body.sourceUrl,...(p.urls||[])].filter(Boolean);const files=urls.map(mediaPathFromUrl);if(files.length<2)throw new Error('视频合成至少需要两个本地视频');const listFile=outFile('.txt');fs.writeFileSync(listFile,files.map(f=>`file '${f.replace(/'/g,"'\\''")}'`).join('\n'));const out=outFile('.mp4');try{await runCmd(FFMPEG_BIN,['-y','-f','concat','-safe','0','-i',listFile,'-c:v','libx264','-preset','veryfast','-crf','20','-c:a','aac','-movflags','+faststart',out]);}finally{try{fs.unlinkSync(listFile)}catch{}}return {outputs:[{type:'video',url:mediaUrl(out)}]};
  }
  throw new Error('不支持的本地媒体处理操作：'+op);
}

function loadProvidersRaw() {
  try { return JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf8')); }
  catch { return []; }
}
function saveProvidersRaw(list) {
  fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(list, null, 2) + '\n');
}
function encryptSecret(value) {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const enc = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map(x => x.toString('base64url')).join('.');
}
function decryptSecret(value) {
  if (!value) return '';
  try {
    const [iv, tag, enc] = value.split('.').map(x => Buffer.from(x, 'base64url'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch { return ''; }
}
function normalizeApiKeyValue(value, authScheme='Bearer', authHeader='Authorization') {
  let key = String(value || '').trim();
  if (!key) return '';
  // Accept common pasted forms: `Authorization: Bearer sk-...` or `Bearer sk-...`.
  key = key.replace(/^Authorization\s*:\s*/i, '').trim();
  const scheme = String(authScheme || '').trim();
  if ((String(authHeader || '').toLowerCase() === 'authorization' || /^bearer$/i.test(scheme)) && /^bearer\s+/i.test(key)) {
    key = key.replace(/^bearer\s+/i, '').trim();
  }
  // Remove accidental wrapping quotes copied from env/config files.
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1,-1).trim();
  return key;
}
function publicProvider(p) {
  const { apiKeyEncrypted, ...rest } = p;
  const decrypted = apiKeyEncrypted ? decryptSecret(apiKeyEncrypted) : '';
  return {
    ...rest,
    hasApiKey: Boolean(apiKeyEncrypted),
    apiKeyReadable: Boolean(!apiKeyEncrypted || decrypted),
    apiKeyHint: decrypted ? `••••${decrypted.slice(-4)}` : ''
  };
}
function uid(prefix='id_') { return prefix + crypto.randomBytes(8).toString('hex'); }
function providerHasApiKey(provider) {
  return Boolean(String(provider?.apiKeyEncrypted || '').trim());
}

function normalizeVideoProtocolConfig(input={}, existing={}) {
  const raw=(input&&typeof input==='object')?input:{};
  const old=(existing&&typeof existing==='object')?existing:{};
  const arr=(v,fallback)=>Array.isArray(v)&&v.length?v.map(String).map(x=>x.trim()).filter(Boolean):fallback;
  return {
    // 创建接口是协议固定项：POST /v1/video/generations。
    pollPath:String(raw.pollPath ?? old.pollPath ?? '/v1/video/generations/{{taskId}}').trim() || '/v1/video/generations/{{taskId}}',
    taskIdPath:String(raw.taskIdPath ?? old.taskIdPath ?? '').trim(),
    statusPath:String(raw.statusPath ?? old.statusPath ?? '').trim(),
    progressPath:String(raw.progressPath ?? old.progressPath ?? '').trim(),
    outputPath:String(raw.outputPath ?? old.outputPath ?? '').trim(),
    successValues:arr(raw.successValues ?? old.successValues,['succeeded','completed','success','done','finished']),
    failureValues:arr(raw.failureValues ?? old.failureValues,['failed','error','cancelled','canceled']),
    pollIntervalMs:Math.max(500,Number(raw.pollIntervalMs ?? old.pollIntervalMs ?? 1500)),
    timeoutMs:Math.max(5000,Number(raw.timeoutMs ?? old.timeoutMs ?? 20*60*1000))
  };
}

function normalizeProvider(input, existing) {
  const normalizedModels = Array.isArray(input.models) ? input.models.map(normalizeModel) : (existing?.models || []);
  const p = {
    id: input.id || existing?.id || uid('prv_'),
    name: String(input.name || existing?.name || '未命名供应商').trim(),
    protocol: ['generic-rest', 'openai-compatible', 'comfyui'].includes(input.protocol) ? input.protocol : (existing?.protocol || 'generic-rest'),
    // 视频协议与基础 HTTP / OpenAI 连接协议解耦。一个供应商下的所有视频模型可继承同一协议。
    videoProtocol: ['auto','standard-video-async-v1'].includes(input.videoProtocol) ? input.videoProtocol : (existing?.videoProtocol || 'auto'),
    videoProtocolConfig: normalizeVideoProtocolConfig(input.videoProtocolConfig, existing?.videoProtocolConfig),
    baseUrl: String(input.baseUrl || existing?.baseUrl || '').replace(/\/+$/, ''),
    authHeader: String(input.authHeader || existing?.authHeader || 'Authorization'),
    authScheme: String(input.authScheme ?? existing?.authScheme ?? 'Bearer'),
    defaultHeaders: typeof input.defaultHeaders === 'object' && input.defaultHeaders ? input.defaultHeaders : (existing?.defaultHeaders || {}),
    testPath: String(input.testPath ?? existing?.testPath ?? ''),
    modelsPath: String(input.modelsPath ?? existing?.modelsPath ?? ''),
    referenceTransport: ['auto','base64','public-url','upload-endpoint'].includes(input.referenceTransport) ? input.referenceTransport : (existing?.referenceTransport || 'auto'),
    publicBaseUrl: String(input.publicBaseUrl ?? existing?.publicBaseUrl ?? '').replace(/\/+$/, ''),
    uploadPath: String(input.uploadPath ?? existing?.uploadPath ?? ''),
    uploadFileField: String(input.uploadFileField ?? existing?.uploadFileField ?? 'file'),
    uploadOutputPath: String(input.uploadOutputPath ?? existing?.uploadOutputPath ?? 'data.url'),
    allowPrivateHosts: input.allowPrivateHosts === true || (input.allowPrivateHosts == null && existing?.allowPrivateHosts === true),
    downloadOutputs: input.downloadOutputs === false ? false : (existing?.downloadOutputs === false ? false : true),
    models: normalizedModels,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    apiKeyEncrypted: existing?.apiKeyEncrypted || ''
  };
  if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
    const normalizedKey = normalizeApiKeyValue(input.apiKey, p.authScheme, p.authHeader);
    if (normalizedKey) p.apiKeyEncrypted = encryptSecret(normalizedKey);
  }
  const hasVideoModels = (p.models || []).some(m => String(m?.modality || '').trim() === 'video');
  if (p.protocol !== 'comfyui' && hasVideoModels && providerHasApiKey(p) && p.videoProtocol === 'auto') {
    p.videoProtocol = 'standard-video-async-v1';
    p.videoProtocolConfig = normalizeVideoProtocolConfig(p.videoProtocolConfig, existing?.videoProtocolConfig);
  }
  p.models=(p.models||[]).map(m=>({...m,adapterKey:m.adapterKey||'auto'}));
  return p;
}


function arrNumbers(v){return Array.isArray(v)?v.map(Number).filter(Number.isFinite):[]}
function arrStrings(v){return Array.isArray(v)?v.map(String).filter(Boolean):[]}
function inferCapabilities(raw={},modality='image',id='',name=''){
  const text=`${id} ${name}`.toLowerCase(), inputMods=arrStrings(raw.input_modalities||raw.inputModalities||raw.inputs||raw.modalities).map(x=>x.toLowerCase()), outputMods=arrStrings(raw.output_modalities||raw.outputModalities||raw.outputs).map(x=>x.toLowerCase());
  const supplied=raw.capabilities&&typeof raw.capabilities==='object'?raw.capabilities:{};
  const cap={modality,...supplied};
  if(modality==='image'){
    cap.aspectRatios=arrStrings(cap.aspectRatios||raw.aspect_ratios||raw.aspectRatios);if(!cap.aspectRatios.length)cap.aspectRatios=['1:1','16:9','9:16','4:3','3:4','21:9'];
    cap.resolutions=arrStrings(cap.resolutions||raw.resolutions||raw.sizes);if(!cap.resolutions.length)cap.resolutions=['1K','2K','4K'];
    cap.maxImages=Number(cap.maxImages||raw.max_images||raw.maxImages||(/edit|fusion|reference|seedream|navo|qwen/.test(text)?4:1));
    cap.supportsImageReference=cap.supportsImageReference ?? true;
    cap.supportsMask=cap.supportsMask ?? /edit|inpaint|repaint|image.*edit|flux.*fill|seedream|navo|qwen/.test(text);
    cap.supportsOutpaint=cap.supportsOutpaint ?? /edit|outpaint|seedream|navo|qwen/.test(text);
    cap.supportsCamera=cap.supportsCamera ?? true; cap.supportsStyle=cap.supportsStyle ?? true;
  }else if(modality==='video'){
    cap.durations=arrNumbers(cap.durations||raw.durations||raw.duration_options);if(!cap.durations.length)cap.durations=/seedance.*2\\.5/.test(text)?[4,5,10,15,30]:/h3|minimax/.test(text)?[4,5,6,8,10,12,15]:[4,5,10];
    const klingFamily=/kling/.test(text);
    cap.resolutions=arrStrings(cap.resolutions||raw.resolutions||raw.sizes);
    if(klingFamily){
      cap.resolutions=cap.resolutions.filter(r=>String(r).toLowerCase()!=='480p');
      if(!cap.resolutions.length)cap.resolutions=['720p','1080p','2160p'];
    }else if(!cap.resolutions.length)cap.resolutions=/h3|minimax/.test(text)?['768p','1440p']:['480p','720p','1080p'];
    cap.aspectRatios=arrStrings(cap.aspectRatios||raw.aspect_ratios||raw.aspectRatios);if(!cap.aspectRatios.length)cap.aspectRatios=['16:9','9:16','1:1','4:3','3:4'];
    cap.maxImages=Number(cap.maxImages||raw.max_images||raw.maxImages||(/seedance.*2\\.5/.test(text)?30:/h3|minimax/.test(text)?9:7));
    cap.maxVideos=Number(cap.maxVideos||raw.max_videos||raw.maxVideos||(/seedance.*2\\.5/.test(text)?10:/h3|minimax/.test(text)?3:1));
    cap.maxAudios=Number(cap.maxAudios||raw.max_audios||raw.maxAudios||(/seedance.*2\\.5/.test(text)?10:/h3|minimax/.test(text)?3:1));
    cap.maxReferences=Number(cap.maxReferences||raw.max_references||raw.maxReferences||(/seedance.*2\\.5/.test(text)?50:/h3|minimax/.test(text)?12:Math.max(9,cap.maxImages+cap.maxVideos+cap.maxAudios)));
    const frameCap=/seedance|h3|minimax|kling|vidu|wan|hailuo|pixverse|runway|sora|veo|luma/.test(text);
    cap.supportsTextToVideo=cap.supportsTextToVideo ?? true;
    cap.supportsFirstFrame=cap.supportsFirstFrame ?? frameCap;
    cap.supportsLastFrame=cap.supportsLastFrame ?? frameCap;
    cap.supportsImageReference=cap.supportsImageReference ?? true;
    cap.supportsVideoReference=cap.supportsVideoReference ?? (/seedance|h3|minimax|kling.?o|wan|vidu|reference|edit/.test(text)||inputMods.includes('video'));
    cap.supportsAudioReference=cap.supportsAudioReference ?? (/seedance|h3|minimax|kling|wan|audio/.test(text)||inputMods.includes('audio'));
    cap.supportsNativeAudio=cap.supportsNativeAudio ?? /seedance|h3|minimax|kling.?3|wan|pixverse|video.?3/.test(text);
    cap.supportsVideoEdit=cap.supportsVideoEdit ?? /seedance|h3|minimax|kling.?o|edit/.test(text);
    cap.supportsExtend=cap.supportsExtend ?? /seedance|h3|minimax|extend|continue/.test(text);
    cap.supportsReshoot=cap.supportsReshoot ?? /seedance|h3|minimax|edit/.test(text);
    cap.supportsSubjects=cap.supportsSubjects ?? /kling.?o|kling.?3|vidu|subject/.test(text);
    if(!Array.isArray(cap.generationModes)||!cap.generationModes.length){
      cap.generationModes=['text2video'];
      if(cap.supportsImageReference!==false)cap.generationModes.push('image2video');
      if(cap.supportsAudioReference||cap.supportsNativeAudio)cap.generationModes.push('audio2video');
      if(cap.supportsFirstFrame||cap.supportsLastFrame)cap.generationModes.push('frame2video');
    }
  }else if(modality==='text'){
    cap.supportsVision=cap.supportsVision ?? (/vl|vision|multi.?modal|cvlm|gvlm/.test(text)||inputMods.some(x=>['image','video','audio'].includes(x)));
    cap.supportsVideoUnderstanding=cap.supportsVideoUnderstanding ?? (/vl|vision|gvlm/.test(text)||inputMods.includes('video'));
    cap.supportsJson=cap.supportsJson ?? true;
    cap.contextWindow=Number(cap.contextWindow||raw.context_window||raw.contextWindow||0);
  }else if(modality==='audio'){
    cap.tts=cap.tts ?? /speech|tts|eleven|minimax/.test(text);cap.music=cap.music ?? /music|mureka|suno|udio/.test(text);cap.voiceClone=cap.voiceClone ?? /minimax|clone|speech/.test(text);
  }
  return cap;
}
function normalizeCapabilities(cap,modality,id,name){return inferCapabilities({capabilities:cap||{}},modality,id,name)}

function normalizeModel(m={}) {
  const modality=['text','image','video','audio','script'].includes(m.modality) ? m.modality : 'image';
  return {
    id: String(m.id || '').trim(),
    name: String(m.name || m.id || '未命名模型').trim(),
    enabled: m.enabled !== false,
    modality,
    // Adapter is the product-facing contract. Raw paths/templates below are only a developer override.
    adapterKey: String(m.adapterKey || 'auto').trim() || 'auto',
    operationRoutes: (m.operationRoutes && typeof m.operationRoutes==='object') ? m.operationRoutes : {},
    createPath: String(m.createPath || '').trim(),
    method: String(m.method || 'POST').toUpperCase(),
    responseMode: m.responseMode === 'async' ? 'async' : 'sync',
    requestTemplate: m.requestTemplate ?? { model: '{{model}}', prompt: '{{prompt}}' },
    outputPath: String(m.outputPath || '').trim(),
    taskIdPath: String(m.taskIdPath || '').trim(),
    pollPath: String(m.pollPath || '').trim(),
    statusPath: String(m.statusPath || '').trim(),
    progressPath: String(m.progressPath || '').trim(),
    successValues: Array.isArray(m.successValues) ? m.successValues : ['succeeded','completed','success'],
    failureValues: Array.isArray(m.failureValues) ? m.failureValues : ['failed','error','cancelled','canceled'],
    pollIntervalMs: Math.max(500, Number(m.pollIntervalMs || 1500)),
    timeoutMs: Math.max(5000, Number(m.timeoutMs || 20 * 60 * 1000)),
    capabilities: normalizeCapabilities(m.capabilities, modality, m.id, m.name),
    pricing: (m.pricing&&typeof m.pricing==='object')?m.pricing:{}
  };
}

const ADAPTER_CATALOG={
  'auto':{label:'自动适配',modalities:['text','script','image','video','audio']},
  'openai-chat':{label:'OpenAI Chat 兼容',modalities:['text','script']},
  'openai-responses':{label:'OpenAI Responses 兼容',modalities:['text','script']},
  'openai-image':{label:'OpenAI Images 兼容',modalities:['image']},
  'openai-audio-speech':{label:'OpenAI Speech 兼容',modalities:['audio']},
  'generic-sync':{label:'通用同步 REST',modalities:['text','script','image','video','audio']},
  'generic-async':{label:'通用异步任务',modalities:['text','script','image','video','audio']},
  'standard-video-async-v1':{label:'标准异步视频协议 v1',modalities:['video']},
  'comfyui-workflow':{label:'ComfyUI 工作流',modalities:['image','video','audio','text','script']}
};
function inferAdapterKey(provider,model){
  const explicit=String(model?.adapterKey||'auto');if(explicit&&explicit!=='auto')return explicit;
  if(provider?.protocol==='comfyui')return 'comfyui-workflow';
  const mod=model?.modality||'image';
  if(mod==='video'&&(provider?.videoProtocol==='standard-video-async-v1'||(providerHasApiKey(provider)&&provider?.videoProtocol!=='auto')))return 'standard-video-async-v1';
  if(provider?.protocol==='openai-compatible'){
    if(mod==='text'||mod==='script')return 'openai-chat';
    if(mod==='image')return 'openai-image';
    if(mod==='audio')return 'openai-audio-speech';
  }
  const path=String(model?.createPath||'').toLowerCase();
  if(/\/responses(?:$|\?)/.test(path))return 'openai-responses';
  if(/\/chat\/completions(?:$|\?)/.test(path))return 'openai-chat';
  if(/\/images\/generations(?:$|\?)/.test(path))return 'openai-image';
  return model?.responseMode==='async'?'generic-async':'generic-sync';
}
function adapterInfo(provider,model){const key=inferAdapterKey(provider,model);return {key,label:ADAPTER_CATALOG[key]?.label||key,ready:adapterReady(provider,model,key)};}
function adapterReady(provider,model,key=inferAdapterKey(provider,model)){
  if(['openai-chat','openai-responses','openai-image','openai-audio-speech','comfyui-workflow'].includes(key))return true;
  if(key==='standard-video-async-v1')return model?.modality==='video'&&providerHasApiKey(provider);
  return Boolean(String(model?.createPath||'').trim());
}
function semanticContext(references=[]){
  const byRole={};for(const r of references){const role=String(r.role||r.usage||'reference');(byRole[role]||(byRole[role]=[])).push(r)}
  const first=(role)=>byRole[role]?.[0]||null;
  return {
    byRole,
    firstFrame:first('first_frame'),lastFrame:first('last_frame'),
    characterReferences:byRole.character_reference||[],sceneReferences:byRole.scene_reference||[],styleReferences:byRole.style_reference||[],
    motionReferences:byRole.motion_reference||[],audioReferences:byRole.audio_reference||[],contextReferences:[...(byRole.prompt_context||[]),...(byRole.script_context||[])],
    firstFrameUrl:first('first_frame')?.url||'',lastFrameUrl:first('last_frame')?.url||''
  };
}

function deepGet(obj, pathText) {
  if (!pathText) return obj;
  const parts = String(pathText).replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function ctxGet(ctx, key) {
  if (key === '') return '';
  return deepGet(ctx, key);
}
function renderTemplate(value, ctx) {
  if (Array.isArray(value)) return value.map(v => renderTemplate(v, ctx));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k,v] of Object.entries(value)) out[k] = renderTemplate(v, ctx);
    return out;
  }
  if (typeof value !== 'string') return value;
  const exact = value.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
  if (exact) {
    const got = ctxGet(ctx, exact[1]);
    return got === undefined ? '' : got;
  }
  return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const got = ctxGet(ctx, k);
    return got == null ? '' : (typeof got === 'string' ? got : JSON.stringify(got));
  });
}
function renderPathTemplate(text, ctx) {
  return String(text || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => encodeURIComponent(String(ctxGet(ctx, k) ?? '')));
}

function normalizeVideoRequestBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const out = { ...body };
  for (const key of ['images', 'videos', 'audios', 'references']) {
    if (typeof out[key] !== 'string') continue;
    const raw = out[key].trim();
    if (!raw) {
      out[key] = [];
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      out[key] = Array.isArray(parsed) ? parsed : [parsed];
      continue;
    } catch {}
    if (raw.includes('\n')) out[key] = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    else if (raw.includes(',')) out[key] = raw.split(',').map(s => s.trim()).filter(Boolean);
    else out[key] = [raw];
  }
  return out;
}

function providerHeaders(provider, extra={}) {
  const headers = { 'Content-Type': 'application/json', ...(provider.defaultHeaders || {}), ...extra };
  const encrypted = String(provider.apiKeyEncrypted || '');
  let key = encrypted ? decryptSecret(encrypted) : '';
  if (encrypted && !key) {
    throw new Error('已保存的 API Key 无法解密。通常是只复制了 providers.json、没有一起复制 .data/secret.key。请到「API供应商」重新输入 API Key 并保存。');
  }
  if (key) {
    const headerName = provider.authHeader || 'Authorization';
    const scheme = String(provider.authScheme || '').trim();
    key = normalizeApiKeyValue(key, scheme, headerName);
    // Never emit `Bearer Bearer xxx` even for legacy data.
    headers[headerName] = scheme ? `${scheme} ${key}` : key;
  }
  return headers;
}

function joinUrl(base, route) {
  if (/^https?:\/\//i.test(route)) return route;
  if (!base) return route;
  const b=String(base).replace(/\/+$/, '');
  let r=String(route||'').trim();
  // Common third-party gateways are configured with Base URL ending in /v1.
  // Avoid accidental /v1/v1/... duplication while keeping custom paths untouched.
  if (/\/v1$/i.test(b) && /^\/v1(?:\/|$)/i.test(r)) r=r.replace(/^\/v1/i,'');
  return b + '/' + r.replace(/^\//, '');
}


function mimeForExt(ext){
  return {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.mov':'video/quicktime','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.aac':'audio/aac','.glb':'model/gltf-binary','.gltf':'model/gltf+json'}[String(ext).toLowerCase()]||'application/octet-stream';
}
function fileToDataUrl(file){
  const buf=fs.readFileSync(file); if(buf.length>35*1024*1024)throw new Error('参考素材超过 35MB，Base64 传输过大；请配置 Public Base URL 或供应商上传接口');
  return `data:${mimeForExt(path.extname(file))};base64,${buf.toString('base64')}`;
}
async function uploadReferenceToProvider(provider,file){
  if(!provider.uploadPath)throw new Error('供应商未配置素材上传接口');
  const fd=new FormData();const buf=fs.readFileSync(file);fd.append(provider.uploadFileField||'file',new Blob([buf],{type:mimeForExt(path.extname(file))}),path.basename(file));
  const headers=providerHeaders(provider);delete headers['Content-Type'];delete headers['content-type'];
  const res=await fetchSafe(joinUrl(provider.baseUrl,provider.uploadPath),{method:'POST',headers,body:fd,timeoutMs:120000},provider);
  const text=await res.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}};if(!res.ok)throw new Error(`供应商素材上传失败 ${res.status}: ${text.slice(0,300)}`);
  const url=deepGet(data,provider.uploadOutputPath||'data.url')||data.url||data.uri;if(!url)throw new Error(`素材上传成功，但未找到返回字段 ${provider.uploadOutputPath||'data.url'}`);return String(url);
}
async function prepareReferences(provider,model,references=[]){
  const cap=model.capabilities||{};const limits={image:Number(cap.maxImages||999),video:Number(cap.maxVideos||999),audio:Number(cap.maxAudios||999),all:Number(cap.maxReferences||999)};
  const counts={image:0,video:0,audio:0};const out=[];
  for(const ref of references){
    const type=ref.type||ref.kind||'image';if(counts[type]!=null&&counts[type]>=limits[type])continue;if(out.length>=limits.all)break;
    let url=String(ref.url||'');
    if(url.startsWith('/media/')){
      const file=mediaPathFromUrl(url);const transport=provider.referenceTransport||'auto';
      if(transport==='upload-endpoint')url=await uploadReferenceToProvider(provider,file);
      else if(transport==='public-url'||(transport==='auto'&&provider.publicBaseUrl)) {
        if(!provider.publicBaseUrl)throw new Error('Public URL 模式需要配置 Public Base URL');
        url=provider.publicBaseUrl.replace(/\/$/,'')+url;
      } else url=fileToDataUrl(file);
    }
    out.push({...ref,url});if(counts[type]!=null)counts[type]++;
  }
  return out;
}
async function materializeRemoteOutput(output,provider){
  if(!output||output.type!=='url'||provider.downloadOutputs===false)return output;
  const value=String(output.value||'');if(value.startsWith('/media/')||value.startsWith('data:'))return output;
  if(!/^https?:\/\//i.test(value))return output;
  try{
    const res=await fetchSafe(value,{method:'GET',headers:{},timeoutMs:120000},provider);if(!res.ok)return output;
    const len=Number(res.headers.get('content-length')||0);if(len>MAX_UPLOAD_BYTES)return output;
    const buf=Buffer.from(await res.arrayBuffer());if(buf.length>MAX_UPLOAD_BYTES)return output;
    const ct=String(res.headers.get('content-type')||'').split(';')[0];const ext=safeExt(new URL(value).pathname,ct);const file=outFile(ext);fs.writeFileSync(file,buf);return {...output,sourceUrl:value,value:mediaUrl(file)};
  }catch{return output}
}

async function fetchJson(url, options={}) {
  const provider=options.provider||null; const clean={...options};delete clean.provider; const timeoutMs=clean.timeoutMs||60000;delete clean.timeoutMs;
  let res;
  if(provider) res=await fetchSafe(url,{...clean,timeoutMs},provider);
  else {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    try{res=await fetch(url,{...clean,signal:controller.signal})}finally{clearTimeout(timeout)}
  }
  const text=await res.text();let data=null;try{data=text?JSON.parse(text):{}}catch{data={raw:text}}
  if(!res.ok){
    let message = `上游 API ${res.status}: ${text.slice(0,600)}`;
    if (res.status === 401) message = `上游 API 401：API Key 无效、已过期或鉴权格式不匹配。请到「API供应商」重新输入 API Key，并使用「测试鉴权」验证。上游返回：${text.slice(0,420)}`;
    else if (res.status === 403) message = `上游 API 403：当前 API Key 没有访问该模型/接口的权限。上游返回：${text.slice(0,420)}`;
    const err=new Error(message);err.status=res.status;err.data=data;throw err
  }
  return data;
}

function normalizeOutput(value, modality, provider) {
  if (value == null) return { type: 'json', value: null };
  if (typeof value === 'string') {
    if (/^(https?:\/\/|data:)/i.test(value)) return { type: 'url', value };
    if (modality === 'text' || modality === 'script') return { type: 'text', value };
    return { type: 'text', value };
  }
  if (Array.isArray(value)) {
    const first = value.find(Boolean);
    return normalizeOutput(first, modality, provider);
  }
  if (typeof value === 'object') {
    const urlKeys = [
      'url','uri','href','file_url','fileUrl','fileURL','download_url','downloadUrl',
      'video_url','videoUrl','image_url','imageUrl','audio_url','audioUrl','source_url','sourceUrl'
    ];
    for (const key of urlKeys) {
      const candidate = value?.[key];
      if (typeof candidate === 'string' && candidate.trim()) return normalizeOutput(candidate, modality, provider);
    }
    const nestedPaths = [
      'data.url','data.video_url','data.videoUrl','data.image_url','data.imageUrl','data.audio_url','data.audioUrl',
      'result.url','result.video_url','result.videoUrl','result.image_url','result.imageUrl','result.audio_url','result.audioUrl',
      'output.url','output.video_url','output.videoUrl','output.image_url','output.imageUrl','output.audio_url','output.audioUrl',
      'outputs.0.url','outputs.0.video_url','outputs.0.videoUrl','outputs.0.image_url','outputs.0.imageUrl','outputs.0.audio_url','outputs.0.audioUrl',
      'images.0.url','videos.0.url','audio.0.url'
    ];
    for (const p of nestedPaths) {
      const candidate = deepGet(value, p);
      if (typeof candidate === 'string' && candidate.trim()) return normalizeOutput(candidate, modality, provider);
    }
    const stack = [value];
    const seen = new Set();
    while (stack.length) {
      const current = stack.pop();
      if (!current || typeof current !== 'object' || seen.has(current)) continue;
      seen.add(current);
      for (const v of Object.values(current)) {
        if (typeof v === 'string' && /^(https?:\/\/|\/media\/|data:)/i.test(v.trim())) {
          return normalizeOutput(v, modality, provider);
        }
        if (Array.isArray(v)) stack.push(...v);
        else if (v && typeof v === 'object') stack.push(v);
      }
    }
    const text = value.text || value.content;
    if (typeof text === 'string') return { type:'text', value:text };
  }
  return { type:'json', value };
}

function taskPublic(t) {
  return {
    id:t.id,status:t.status,progress:t.progress,nodeType:t.nodeType,providerId:t.providerId,modelId:t.modelId,
    output:t.output||null,error:t.error||null,createdAt:t.createdAt,updatedAt:t.updatedAt,attempt:t.attempt||0,
    maxRetries:t.maxRetries||0,cancelRequested:Boolean(t.cancelRequested),priority:Number(t.priority??50),logs:t.logs||[]
  };
}
function updateTask(task, patch) {
  const next=store.updateTask(task.id,{...patch,updatedAt:new Date().toISOString()});
  if(next)Object.assign(task,next);return task;
}
function taskLog(task,message,level='info'){store.appendTaskLog(task.id,message,level);const fresh=store.getTask(task.id);if(fresh)Object.assign(task,fresh)}
function assertTaskActive(task){const fresh=store.getTask(task.id);if(fresh?.cancelRequested||fresh?.status==='canceled')throw Object.assign(new Error('任务已取消'),{code:'TASK_CANCELLED'});}

async function executeGeneric(task, provider, model, payload) {
  const ctx = {
    model: model.id,
    prompt: payload.prompt || '',
    nodeType: task.nodeType,
    aspectRatio: payload.parameters?.aspectRatio || '16:9',
    count: payload.parameters?.count || 1,
    duration: payload.parameters?.duration || 5,
    resolution: payload.parameters?.resolution || '720p',
    references: payload.references || [],
    images:(payload.references||[]).filter(r=>r.type==='image').map(r=>r.url),
    videos:(payload.references||[]).filter(r=>r.type==='video').map(r=>r.url),
    audios:(payload.references||[]).filter(r=>r.type==='audio').map(r=>r.url),
    texts:(payload.references||[]).filter(r=>r.type==='text').map(r=>r.text||''),
    semantic: semanticContext(payload.references||[]),
    params: payload.parameters || {},
    operation: payload.parameters?.operation || 'generate'
  };
  Object.assign(ctx,ctx.semantic);
  // 不再猜测不存在的 /v1/generate。
  // 未配置路由时，文本/图片先按最常见的 OpenAI 兼容协议尝试；视频/音频必须显式配置。
  const operation=String(payload.parameters?.operation||'generate');
  const opConfig=model.operationRoutes?.[operation]||model.operationRoutes?.generate||{};
  let route = String(opConfig.createPath || model.createPath || '').trim();
  let implicitOpenAI = false;
  if(!route){
    if(task.nodeType==='text'||task.nodeType==='script'){route='/v1/chat/completions';implicitOpenAI=true;}
    else if(task.nodeType==='image'){route='/v1/images/generations';implicitOpenAI=true;}
    else throw new Error(`模型「${model.name||model.id}」尚未完成自动适配。请在「全部模型」→「开发者高级设置」为该模型补充真实生成接口；正常创作界面不会再暴露这些字段。`);
  }
  const url = joinUrl(provider.baseUrl, renderPathTemplate(route, ctx));
  const routeLower=route.toLowerCase();
  const isChatCompletions=/\/chat\/completions(?:$|\?)/.test(routeLower);
  const isResponses=/\/responses(?:$|\?)/.test(routeLower);
  const isImageGenerations=/\/images\/generations(?:$|\?)/.test(routeLower);
  let body = renderTemplate(opConfig.requestTemplate || model.requestTemplate, ctx);
  // 兼容旧版本保存的 {model,prompt} 模板：标准 chat/completions 需要 messages。
  if(isChatCompletions && (!body || !Array.isArray(body.messages))){
    body={model:model.id,messages:[{role:'user',content:payload.prompt||''}]};
    if(payload.parameters?.responseFormat==='json_object')body.response_format={type:'json_object'};
  } else if(isResponses && (!body || body.input==null)){
    body={model:model.id,input:payload.prompt||''};
  } else if(isImageGenerations && (!body || (!body.prompt && !body.input))){
    body={model:model.id,prompt:payload.prompt||'',n:payload.parameters?.count||1};
  }
  // 这些标准端点本身是同步 HTTP 响应，旧配置即便误选“异步任务”也不再进入轮询。
  const effectiveResponseMode=(isChatCompletions||isResponses||isImageGenerations)?'sync':(opConfig.responseMode||model.responseMode);
  updateTask(task, { progress: 8 });
  let created=null,upstreamTaskId='';
  const resume=payload._upstream&&payload._upstream.protocol==='generic'&&payload._upstream.modelId===model.id?payload._upstream:null;
  if(effectiveResponseMode==='async'&&resume?.id){
    upstreamTaskId=String(resume.id);updateTask(task,{progress:Math.max(12,task.progress||0)});taskLog(task,`恢复轮询上游任务：${upstreamTaskId}`);
  }else{
    const requestBody = task.nodeType === 'video' ? normalizeVideoRequestBody(body) : body;
    created = await fetchJson(url, {
      method: opConfig.method || model.method || 'POST',
      headers: providerHeaders(provider),
      body: ['GET','HEAD'].includes(opConfig.method||model.method) ? undefined : JSON.stringify(requestBody),
      timeoutMs: Math.min(model.timeoutMs, 120000), provider
    });
    updateTask(task, { progress: 20 });
    if (effectiveResponseMode !== 'async') {
      let raw;
      if(isChatCompletions) raw=deepGet(created,'choices.0.message.content');
      else if(isResponses) raw=deepGet(created,'output.0.content.0.text') ?? deepGet(created,'output_text') ?? deepGet(created,'response.output_text');
      else if(isImageGenerations) raw=deepGet(created,'data.0.url') ?? (deepGet(created,'data.0.b64_json')?`data:image/png;base64,${deepGet(created,'data.0.b64_json')}`:undefined);
      else {const outputPath=opConfig.outputPath||model.outputPath;raw = outputPath ? deepGet(created, outputPath) : created;if(raw==null && outputPath)raw=deepGet(created,outputPath);}
      return normalizeOutput(raw ?? created, task.nodeType, provider);
    }
    const taskIdPath=opConfig.taskIdPath||model.taskIdPath||'id';upstreamTaskId = deepGet(created, taskIdPath);
    if (!upstreamTaskId) throw new Error(`创建任务成功，但未能从字段「${taskIdPath}」读取任务 ID`);
    payload._upstream={protocol:'generic',modelId:model.id,id:String(upstreamTaskId),createdAt:new Date().toISOString()};task.payload=payload;updateTask(task,{payload});taskLog(task,`已持久化上游任务 ID：${upstreamTaskId}`);
  }
  const started = Date.now();
  let checks = 0;
  while (Date.now() - started < model.timeoutMs) {
    assertTaskActive(task);
    await new Promise(r => setTimeout(r, model.pollIntervalMs));
    checks++;
    const pollCtx = { ...ctx, taskId: upstreamTaskId };
    const pollPath=opConfig.pollPath||model.pollPath||'/v1/tasks/{{taskId}}';const pollUrl = joinUrl(provider.baseUrl, renderPathTemplate(pollPath, pollCtx));
    const polled = await fetchJson(pollUrl, { method:'GET', headers:providerHeaders(provider), timeoutMs:60000, provider });
    const statusPath=opConfig.statusPath||model.statusPath;const statusRaw = statusPath ? deepGet(polled, statusPath) : polled.status;
    const status = String(statusRaw ?? '').toLowerCase();
    const progressPath=opConfig.progressPath||model.progressPath;const progressRaw = progressPath ? Number(deepGet(polled, progressPath)) : NaN;
    updateTask(task, { progress: Number.isFinite(progressRaw) ? Math.max(20, Math.min(96, progressRaw)) : Math.min(92, 20 + checks * 5) });
    const failureValues=(opConfig.failureValues||model.failureValues||[]).map(v=>String(v).toLowerCase());
    const successValues=(opConfig.successValues||model.successValues||[]).map(v=>String(v).toLowerCase());
    if (failureValues.includes(status)) {
      throw new Error(`上游任务失败：${status || 'unknown'}`);
    }
    const pollOutputPath=opConfig.outputPath||model.outputPath;const outputRaw = pollOutputPath ? deepGet(polled, pollOutputPath) : undefined;
    if (successValues.includes(status) || (!statusPath && outputRaw != null)) {
      return normalizeOutput(outputRaw ?? polled, task.nodeType, provider);
    }
  }
  throw new Error('上游任务超时');
}

async function executeOpenAIChat(task, provider, model, payload, useResponses=false) {
  const sem=semanticContext(payload.references||[]);const refs=payload.references||[];
  updateTask(task,{progress:10});
  if(useResponses){
    const input=[{role:'user',content:[{type:'input_text',text:payload.prompt||''}]}];
    for(const r of refs.filter(x=>x.type==='image'&&x.url).slice(0,12))input[0].content.push({type:'input_image',image_url:r.url});
    const body={model:model.id,input};
    const data=await fetchJson(joinUrl(provider.baseUrl,'/v1/responses'),{method:'POST',headers:providerHeaders(provider),body:JSON.stringify(body),timeoutMs:120000,provider});
    return normalizeOutput(deepGet(data,'output_text')??deepGet(data,'output.0.content.0.text')??data,'text',provider);
  }
  let content=payload.prompt||'';
  const imageRefs=refs.filter(x=>x.type==='image'&&x.url).slice(0,12);
  if(model.capabilities?.supportsVision&&imageRefs.length){content=[{type:'text',text:payload.prompt||''},...imageRefs.map(r=>({type:'image_url',image_url:{url:r.url},semantic_role:r.role||'reference'}))]}
  const body={model:model.id,messages:[{role:'user',content}]};
  if(payload.parameters?.responseFormat==='json_object'||payload.parameters?.operation==='script_breakdown'||payload.parameters?.operation==='prompt_synthesis')body.response_format={type:'json_object'};
  const data=await fetchJson(joinUrl(provider.baseUrl,'/v1/chat/completions'),{method:'POST',headers:providerHeaders(provider),body:JSON.stringify(body),timeoutMs:120000,provider});
  return normalizeOutput(deepGet(data,'choices.0.message.content')??data,'text',provider);
}
async function executeOpenAIImage(task, provider, model, payload) {
  updateTask(task,{progress:10});const sem=semanticContext(payload.references||[]);
  const body={model:model.id,prompt:payload.prompt||'',n:payload.parameters?.count||1};
  if(payload.parameters?.size)body.size=payload.parameters.size;
  if(payload.parameters?.aspectRatio)body.aspect_ratio=payload.parameters.aspectRatio;
  const data=await fetchJson(joinUrl(provider.baseUrl,'/v1/images/generations'),{method:'POST',headers:providerHeaders(provider),body:JSON.stringify(body),timeoutMs:120000,provider});
  const url=deepGet(data,'data.0.url'),b64=deepGet(data,'data.0.b64_json');
  return normalizeOutput(url||(b64?`data:image/png;base64,${b64}`:data),'image',provider);
}
async function executeOpenAIAudio(task, provider, model, payload){
  updateTask(task,{progress:10});
  const body={model:model.id,input:payload.prompt||'',voice:payload.parameters?.voice||'alloy',format:payload.parameters?.format||'mp3'};
  const url=joinUrl(provider.baseUrl,'/v1/audio/speech');
  const res=await fetchSafe(url,{method:'POST',headers:providerHeaders(provider),body:JSON.stringify(body),timeoutMs:120000},provider);
  if(!res.ok){const t=await res.text();throw new Error(`上游 API ${res.status}: ${t.slice(0,500)}`)}
  const buf=Buffer.from(await res.arrayBuffer()),file=outFile('.mp3');fs.writeFileSync(file,buf);return {type:'url',value:mediaUrl(file)};
}
function firstDeepValue(obj, paths=[]) {
  for(const p of paths){const v=deepGet(obj,p);if(v!==undefined&&v!==null&&v!=='')return v}
  return undefined;
}
function findStringByPrefix(value,prefix,depth=0){
  if(depth>6||value==null)return '';
  if(typeof value==='string')return value.startsWith(prefix)?value:'';
  if(Array.isArray(value)){for(const x of value){const hit=findStringByPrefix(x,prefix,depth+1);if(hit)return hit}return ''}
  if(typeof value==='object'){for(const x of Object.values(value)){const hit=findStringByPrefix(x,prefix,depth+1);if(hit)return hit}}
  return '';
}
function standardVideoBody(model,payload){
  const p={...(payload.parameters||{})};
  const body={model:model.id,prompt:payload.prompt||''};
  const duration=Number(p.duration);if(Number.isFinite(duration)&&duration>0)body.duration=duration;
  const ratio=String(p.ratio||p.aspectRatio||'').trim();if(ratio)body.ratio=ratio;
  if(p.resolution!=null&&String(p.resolution).trim())body.resolution=p.resolution;
  // 允许供应商扩展参数透传，但过滤 Canvas 内部状态，避免把能力描述/上下文包误发给上游。
  const internal=new Set(['aspectRatio','ratio','duration','resolution','count','capabilities','creativeContext','contextPacket','operation','sourceVersionId','sourceVideoUrl','sourceDuration','preserveOutsideRange']);
  for(const [k,v] of Object.entries(p)){
    if(internal.has(k)||v===undefined)continue;
    if(k==='supplierParams'||k==='providerParams'){
      if(v&&typeof v==='object'&&!Array.isArray(v))Object.assign(body,v);
      continue;
    }
    // 普通生成参数允许透传；明显属于 Canvas 内部对象的键不进入上游。
    if(!/^[_$]/.test(k))body[k]=v;
  }
  return body;
}
function standardVideoTaskId(created,config={}){
  if(config.taskIdPath){const explicit=deepGet(created,config.taskIdPath);if(explicit)return String(explicit)}
  const common=firstDeepValue(created,['id','task_id','taskId','data.id','data.task_id','data.taskId','task.id','result.id']);
  return common?String(common):findStringByPrefix(created,'video_task_');
}
function standardVideoStatus(polled,config={}){
  if(config.statusPath)return deepGet(polled,config.statusPath);
  return firstDeepValue(polled,['status','data.status','state','data.state','task.status','result.status']);
}
function standardVideoProgress(polled,config={}){
  if(config.progressPath)return deepGet(polled,config.progressPath);
  return firstDeepValue(polled,['progress','data.progress','percent','data.percent','task.progress']);
}
function standardVideoOutput(polled,config={}){
  if(config.outputPath)return deepGet(polled,config.outputPath);
  return firstDeepValue(polled,[
    'output.url','output.video_url','output.videoUrl','data.output.url','data.output.video_url','data.video_url','data.videoUrl',
    'video_url','videoUrl','result.url','result.video_url','data.result.url','data.result.video_url','url','data.url','output.0.url','data.output.0.url'
  ]);
}
async function executeStandardVideoAsync(task,provider,model,payload){
  if(task.nodeType!=='video')throw new Error('标准异步视频协议只能用于视频模型');
  const config=normalizeVideoProtocolConfig(provider.videoProtocolConfig,provider.videoProtocolConfig);
  const createPath='/v1/video/generations';
  const createUrl=joinUrl(provider.baseUrl,createPath);
  const body=standardVideoBody(model,payload);
  updateTask(task,{progress:8});
  let taskId='';
  const resume=payload._upstream&&payload._upstream.protocol==='standard-video-async-v1'&&payload._upstream.modelId===model.id?payload._upstream:null;
  if(resume?.id){taskId=String(resume.id);taskLog(task,`恢复标准视频任务：${taskId}`)}
  else{
    taskLog(task,`标准异步视频：POST ${createPath}`);
    const created=await fetchJson(createUrl,{method:'POST',headers:providerHeaders(provider),body:JSON.stringify(body),timeoutMs:Math.min(config.timeoutMs,120000),provider});
    taskId=standardVideoTaskId(created,config);
    if(!taskId)throw new Error('视频任务已提交，但响应中未找到任务 ID。标准协议会自动识别 id / task_id / data.id / video_task_*；如供应商字段不同，请在供应商「视频协议高级设置」填写任务 ID 字段。');
    payload._upstream={protocol:'standard-video-async-v1',modelId:model.id,id:String(taskId),createdAt:new Date().toISOString()};
    task.payload=payload;updateTask(task,{payload,progress:20});taskLog(task,`已持久化视频任务 ID：${taskId}`);
  }
  const started=Date.now();let checks=0;
  const success=(config.successValues||[]).map(x=>String(x).toLowerCase()),failure=(config.failureValues||[]).map(x=>String(x).toLowerCase());
  while(Date.now()-started<config.timeoutMs){
    assertTaskActive(task);await new Promise(r=>setTimeout(r,config.pollIntervalMs));checks++;
    const pollPath=renderPathTemplate(config.pollPath||'/v1/video/generations/{{taskId}}',{taskId});
    const polled=await fetchJson(joinUrl(provider.baseUrl,pollPath),{method:'GET',headers:providerHeaders(provider),timeoutMs:60000,provider});
    const statusRaw=standardVideoStatus(polled,config),status=String(statusRaw??'').toLowerCase();
    const progressRaw=Number(standardVideoProgress(polled,config));
    updateTask(task,{status:'polling',progress:Number.isFinite(progressRaw)?Math.max(20,Math.min(96,progressRaw)):Math.min(94,20+checks*4)});
    if(failure.includes(status))throw new Error(`上游视频任务失败：${status||'unknown'}`);
    const output=standardVideoOutput(polled,config);
    if(success.includes(status)||(!status&&output!=null)){
      if(output==null)throw new Error(`视频任务状态为 ${status||'成功'}，但没有解析到视频结果 URL。请在供应商「视频协议高级设置」填写结果字段。`);
      return normalizeOutput(output,'video',provider);
    }
  }
  throw new Error('标准异步视频任务超时');
}

async function executeOpenAI(task, provider, model, payload) {
  const key=inferAdapterKey(provider,model);
  if(key==='openai-responses')return executeOpenAIChat(task,provider,model,payload,true);
  if(key==='openai-chat')return executeOpenAIChat(task,provider,model,payload,false);
  if(key==='openai-image')return executeOpenAIImage(task,provider,model,payload);
  if(key==='openai-audio-speech')return executeOpenAIAudio(task,provider,model,payload);
  return executeGeneric(task,provider,model,payload);
}

async function executeComfyUI(task, provider, model, payload) {
  const ctx = {
    model: model.id,
    prompt: payload.prompt || '',
    nodeType: task.nodeType,
    aspectRatio: payload.parameters?.aspectRatio || '16:9',
    count: payload.parameters?.count || 1,
    duration: payload.parameters?.duration || 5,
    resolution: payload.parameters?.resolution || '720p',
    references: payload.references || [],
    images:(payload.references||[]).filter(r=>r.type==='image').map(r=>r.url),
    videos:(payload.references||[]).filter(r=>r.type==='video').map(r=>r.url),
    audios:(payload.references||[]).filter(r=>r.type==='audio').map(r=>r.url),
    texts:(payload.references||[]).filter(r=>r.type==='text').map(r=>r.text||''),
    semantic: semanticContext(payload.references||[]),
    params: payload.parameters || {}
  };
  Object.assign(ctx,ctx.semantic);
  const workflow = renderTemplate(model.requestTemplate || {}, ctx);
  updateTask(task,{progress:8});
  let promptId='';const resume=payload._upstream&&payload._upstream.protocol==='comfyui'&&payload._upstream.modelId===model.id?payload._upstream:null;
  if(resume?.id){promptId=String(resume.id);taskLog(task,`恢复 ComfyUI prompt：${promptId}`)}else{
    const created = await fetchJson(joinUrl(provider.baseUrl, model.createPath || '/prompt'), {
      method:'POST', headers:providerHeaders(provider), body:JSON.stringify({prompt:workflow}), timeoutMs:120000, provider
    });
    promptId = created.prompt_id || created.id;
    if (!promptId) throw new Error('ComfyUI 未返回 prompt_id');
    payload._upstream={protocol:'comfyui',modelId:model.id,id:String(promptId),createdAt:new Date().toISOString()};task.payload=payload;updateTask(task,{payload});taskLog(task,`已持久化 ComfyUI prompt_id：${promptId}`);
  }
  const started = Date.now();
  let checks = 0;
  while (Date.now() - started < model.timeoutMs) {
    assertTaskActive(task);
    await new Promise(r=>setTimeout(r, model.pollIntervalMs));
    checks++;
    const history = await fetchJson(joinUrl(provider.baseUrl, `/history/${encodeURIComponent(promptId)}`), { headers:providerHeaders(provider), timeoutMs:60000, provider });
    const record = history[promptId] || history;
    if (record && record.outputs) {
      const files = [];
      for (const output of Object.values(record.outputs)) {
        for (const key of ['images','gifs','videos','audio']) {
          if (Array.isArray(output?.[key])) files.push(...output[key]);
        }
      }
      if (files.length) {
        const f = files[0];
        const query = new URLSearchParams({ filename:f.filename || '', subfolder:f.subfolder || '', type:f.type || 'output' });
        return { type:'url', value:joinUrl(provider.baseUrl, `/view?${query.toString()}`) };
      }
      if (record.status?.status_str === 'error') throw new Error('ComfyUI 任务执行失败');
    }
    updateTask(task,{progress:Math.min(94,15+checks*4)});
  }
  throw new Error('ComfyUI 任务超时');
}

async function runTask(task, payload) {
  const providers=loadProvidersRaw();const provider=providers.find(p=>p.id===task.providerId);
  if(!provider)throw new Error('API 供应商不存在');
  const model=(provider.models||[]).find(m=>m.id===task.modelId&&m.modality===task.nodeType);
  if(!model)throw new Error('所选模型不存在，或模型类型与节点类型不匹配');
  assertTaskActive(task);taskLog(task,`开始执行：${provider.name} / ${model.name||model.id}`);
  payload={...payload,references:await prepareReferences(provider,model,payload.references||[])};
  task.payload=payload;updateTask(task,{payload,progress:3,status:'running',error:null});
  let output;const adapter=inferAdapterKey(provider,model);taskLog(task,`适配器：${ADAPTER_CATALOG[adapter]?.label||adapter}`);
  if(adapter==='comfyui-workflow')output=await executeComfyUI(task,provider,model,payload);
  else if(adapter==='standard-video-async-v1')output=await executeStandardVideoAsync(task,provider,model,payload);
  else if(adapter.startsWith('openai-'))output=await executeOpenAI(task,provider,model,payload);
  else output=await executeGeneric(task,provider,model,payload);
  assertTaskActive(task);output=await materializeRemoteOutput(output,provider);
  updateTask(task,{status:'succeeded',progress:100,output,error:null});taskLog(task,'任务完成');
}
async function runTaskById(id){
  const task=store.getTask(id);if(!task)return;
  try{await runTask(task,task.payload||{});}
  catch(err){
    const fresh=store.getTask(id)||task;
    if(err?.code==='TASK_CANCELLED'||fresh.cancelRequested){updateTask(fresh,{status:'canceled',error:null,progress:fresh.progress});taskLog(fresh,'任务已取消','warn');return}
    const attempt=Number(fresh.attempt||0)+1;
    if(attempt<=Number(fresh.maxRetries||0)){updateTask(fresh,{status:'queued',attempt,error:err?.message||String(err),progress:0});taskLog(fresh,`执行失败，准备第 ${attempt+1} 次尝试：${err?.message||err}`,'warn');setTimeout(processTaskQueue,300);return}
    updateTask(fresh,{status:'failed',attempt,error:err?.message||String(err)});taskLog(fresh,`任务失败：${err?.message||err}`,'error');
  }
}
function processTaskQueue(){
  if(taskQueuePaused)return;
  while(runningTasks<TASK_CONCURRENCY){
    const next=store.nextQueuedTask();if(!next)break;
    store.updateTask(next.id,{status:'running',progress:Math.max(1,next.progress||0),cancelRequested:false});
    runningTasks++;
    runTaskById(next.id).catch(()=>{}).finally(()=>{runningTasks--;setTimeout(processTaskQueue,20)});
  }
}

function modelEndpointCandidates(provider) {
  if (provider.modelsPath) return [provider.modelsPath];
  if (provider.protocol === 'comfyui') return ['/object_info'];
  const base = String(provider.baseUrl || '').replace(/\/+$/, '');
  // Many OpenAI-compatible vendors let users enter either https://host or https://host/v1.
  if (/\/v1$/i.test(base)) return ['/models'];
  return ['/v1/models', '/models'];
}

function inferModality(item, id, name) {
  const explicit = String(item?.modality || item?.type || item?.model_type || item?.category || '').toLowerCase();
  const caps = Array.isArray(item?.capabilities) ? item.capabilities.join(' ').toLowerCase() : String(item?.capabilities || '').toLowerCase();
  const hay = `${explicit} ${caps} ${id} ${name}`.toLowerCase();
  if (/(video|seedance|kling|hailuo|vidu|pixverse|runway|sora|veo|wan[-_. ]?2|hunyuan[-_. ]?video|ltx[-_. ]?video)/.test(hay)) return 'video';
  if (/(image|flux|seedream|dall[-_. ]?e|imagen|recraft|ideogram|sdxl|stable[-_. ]?diffusion|qwen[-_. ]?image|nano[-_. ]?banana)/.test(hay)) return 'image';
  if (/(audio|speech|tts|voice|music|eleven|mureka|suno|whisper)/.test(hay)) return 'audio';
  return 'text';
}

function extractModelArray(data) {
  if (Array.isArray(data)) return data;
  const paths = ['data','models','items','result.data','result.models','result.items','data.models','data.items'];
  for (const p of paths) {
    const v = deepGet(data, p);
    if (Array.isArray(v)) return v;
  }
  return [];
}

function normalizeDiscoveredModels(data) {
  const list = extractModelArray(data);
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const obj = typeof item === 'string' ? { id:item, name:item } : (item || {});
    const id = String(obj.id || obj.model || obj.model_id || obj.slug || obj.key || obj.name || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = String(obj.display_name || obj.displayName || obj.label || obj.name || id).trim();
    const modality=inferModality(obj,id,name);
    out.push({ id, name, modality, ownedBy:String(obj.owned_by || obj.owner || obj.provider || ''), capabilities:inferCapabilities(obj,modality,id,name) });
  }
  return out;
}

function detectModelListProtocol(data,route=''){
  const first=Array.isArray(data?.data)?data.data[0]:null;
  const openaiShape=(data?.object==='list'&&Array.isArray(data?.data)) || (first&&first.object==='model') || String(route).replace(/\/$/,'')==='/v1/models';
  return openaiShape?'openai-compatible':'';
}

async function fetchModelsFromProvider(provider) {
  if (!provider.baseUrl) throw new Error('Base URL 不能为空');
  const errors = [];
  for (const route of modelEndpointCandidates(provider)) {
    const url = joinUrl(provider.baseUrl, route);
    try {
      const data = await fetchJson(url, { method:'GET', headers:providerHeaders(provider), timeoutMs:15000, provider });
      const models = normalizeDiscoveredModels(data);
      if (models.length) return { models, endpoint:route, preview:JSON.stringify(data).slice(0,500), suggestedProtocol:detectModelListProtocol(data,route) };
      errors.push(`${route}: 已连接，但没有识别到模型列表`);
    } catch (err) {
      errors.push(`${route}: ${err.message}`);
    }
  }
  throw new Error(`连接成功性无法确认或未找到模型列表。${errors.join('；')}`);
}

async function testProviderConfig(input) {
  const existing = input.id ? loadProvidersRaw().find(p => p.id === input.id) : null;
  const provider = normalizeProvider(input, existing || null);
  if (!provider.baseUrl) throw new Error('Base URL 不能为空');
  // Since normalizeProvider encrypts input.apiKey, this works for unsaved config.
  if (provider.testPath) {
    const url = joinUrl(provider.baseUrl, provider.testPath);
    const data = await fetchJson(url, { method:'GET', headers:providerHeaders(provider), timeoutMs:15000, provider });
    return { ok:true, endpoint:provider.testPath, preview:JSON.stringify(data).slice(0,500) };
  }
  if (provider.protocol === 'comfyui') {
    const route = '/system_stats';
    const data = await fetchJson(joinUrl(provider.baseUrl, route), { method:'GET', headers:providerHeaders(provider), timeoutMs:15000, provider });
    return { ok:true, endpoint:route, preview:JSON.stringify(data).slice(0,500) };
  }
  try {
    const discovered = await fetchModelsFromProvider(provider);
    return { ok:true, endpoint:discovered.endpoint, modelCount:discovered.models.length, preview:`已识别 ${discovered.models.length} 个模型` };
  } catch (modelErr) {
    // Generic providers may expose no model-list endpoint but still answer on their root.
    if (provider.protocol === 'generic-rest') {
      const data = await fetchJson(provider.baseUrl, { method:'GET', headers:providerHeaders(provider), timeoutMs:15000, provider });
      return { ok:true, endpoint:'/', preview:JSON.stringify(data).slice(0,500), warning:modelErr.message };
    }
    throw modelErr;
  }
}

async function testProviderAuth(input) {
  const existing = input.id ? loadProvidersRaw().find(p => p.id === input.id) : null;
  const provider = normalizeProvider(input, existing || null);
  if (!provider.baseUrl) throw new Error('Base URL 不能为空');
  // Fail locally if an encrypted key exists but cannot be decrypted.
  providerHeaders(provider);
  const models = Array.isArray(provider.models) ? provider.models.filter(m=>m.enabled!==false) : [];
  const textModel = models.find(m=>m.modality==='text');
  if (textModel) {
    const route = String(textModel.createPath || '').trim() || '/v1/chat/completions';
    const url = joinUrl(provider.baseUrl, route);
    const body = /\/chat\/completions(?:$|\?)/i.test(route)
      ? {model:textModel.id,messages:[{role:'user',content:'只回复 OK'}]}
      : renderTemplate(textModel.requestTemplate || {model:'{{model}}',prompt:'{{prompt}}'}, {model:textModel.id,prompt:'只回复 OK',references:[],images:[],videos:[],audios:[],texts:[],params:{}});
    await fetchJson(url,{method:textModel.method||'POST',headers:providerHeaders(provider),body:JSON.stringify(body),timeoutMs:45000,provider});
    return {ok:true,endpoint:route,modelId:textModel.id,mode:'model-request'};
  }
  // If there is no text model, verify the exact Authorization header against the model-list endpoint.
  const discovered = await fetchModelsFromProvider(provider);
  return {ok:true,endpoint:discovered.endpoint,modelCount:discovered.models.length,mode:'model-list'};
}

async function diagnoseProvider(input){
  const existing=input.id?loadProvidersRaw().find(p=>p.id===input.id):null;
  const provider=normalizeProvider(input,existing||null);
  const report={ok:true,connection:{ok:false},auth:{ok:false},models:{total:0,ready:0,pending:0,byType:{text:0,image:0,video:0,audio:0}},warnings:[]};
  try{const r=await testProviderConfig(input);report.connection={ok:true,endpoint:r.endpoint||'',modelCount:r.modelCount||0,warning:r.warning||''};if(r.warning)report.warnings.push(r.warning)}catch(e){report.ok=false;report.connection={ok:false,error:e.message}}
  try{const r=await testProviderAuth(input);report.auth={ok:true,endpoint:r.endpoint||'',modelId:r.modelId||'',mode:r.mode||''}}catch(e){report.ok=false;report.auth={ok:false,error:e.message}}
  const models=(provider.models||[]).filter(m=>m.enabled!==false);report.models.total=models.length;for(const m of models){const info=adapterInfo(provider,m);report.models.byType[m.modality]=(report.models.byType[m.modality]||0)+1;if(info.ready)report.models.ready++;else{report.models.pending++;report.warnings.push(`模型 ${m.name||m.id} 尚未完成适配`)}}
  if(!models.length)report.warnings.push('还没有选择要使用的模型');
  return report;
}

async function discoverProviderModels(input) {
  const existing = input.id ? loadProvidersRaw().find(p => p.id === input.id) : null;
  const provider = normalizeProvider(input, existing || null);
  const discovered = await fetchModelsFromProvider(provider);
  return { ok:true, endpoint:discovered.endpoint, count:discovered.models.length, models:discovered.models, suggestedProtocol:discovered.suggestedProtocol||'' };
}


function normalizeSearchText(x){return String(x||'').toLowerCase().replace(/[\s，。、“”‘’：；,.!?@#_\-]+/g,' ').trim()}
function ngrams(text,n=2){const t=text.replace(/\s+/g,'');const out=new Set();for(let i=0;i<=t.length-n;i++)out.add(t.slice(i,i+n));return out}
const AUTOLINK_CONCEPTS=[
  {id:'character',terms:['角色','人物','主角','女主','男主','演员','主体','character','person','subject','hero']},
  {id:'scene',terms:['场景','环境','地点','背景','室内','室外','scene','background','location','environment']},
  {id:'style',terms:['风格','画风','质感','色调','参考风格','style','look','visual style']},
  {id:'first_frame',terms:['首帧','第一帧','开场帧','起始画面','first frame','start frame']},
  {id:'last_frame',terms:['尾帧','末帧','结束画面','last frame','end frame']},
  {id:'motion',terms:['运镜','镜头语言','镜头运动','运动参考','camera motion','motion','camera movement']},
  {id:'video',terms:['参考视频','视频参考','视频','video reference','video']},
  {id:'audio',terms:['音频','音乐','配乐','声音','audio','music','sound','bgm']},
  {id:'voice',terms:['音色','声音克隆','配音','voice','speaker','voice reference']},
  {id:'prompt',terms:['设定','描述','提示词','剧情','台词','prompt','description','script','story']}
];
function conceptSet(text){const t=normalizeSearchText(text),out=new Set();for(const c of AUTOLINK_CONCEPTS)if(c.terms.some(x=>t.includes(x)))out.add(c.id);return out}
function semanticScore(a,b,type=''){if(!a||!b)return 0;if(b.includes(a)||a.includes(b))return .96;const A=ngrams(a),B=ngrams(b);let inter=0;for(const x of A)if(B.has(x))inter++;const union=A.size+B.size-inter,jac=union?inter/union:0,words=a.split(' ').filter(Boolean),hits=words.filter(w=>w.length>1&&b.includes(w)).length,ca=conceptSet(a),cb=conceptSet(b);let concept=0;for(const x of ca)if(cb.has(x))concept++;concept=ca.size?concept/ca.size:0;const typeMatch=(ca.has('character')&&['image','subject','asset'].includes(type))||(ca.has('scene')&&['image','asset'].includes(type))||(ca.has('motion')&&type==='video')||(ca.has('audio')&&type==='audio');const typeBoost=typeMatch ? .12 : 0;return Math.min(1,jac*.42+(words.length?hits/words.length:0)*.18+concept*.34+typeBoost)}
function semanticTitleKey(x){return normalizeSearchText(x).replace(/\s+/g,'').replace(/(?:角色|人物|主体|模特|场景|环境|背景|素材|参考图|参考|图片|图像|视频|音频|风格)$/g,'').trim()}
function candidateSemanticScore(query,c){const hay=normalizeSearchText([c.title,c.text,(c.tags||[]).join(' ')].filter(Boolean).join(' ')),title=normalizeSearchText(c.title||''),key=semanticTitleKey(c.title||'');let score=semanticScore(query,hay,c.type);if(title&&query.includes(title))score=Math.max(score,.99);if(key&&key.length>=2&&query.replace(/\s+/g,'').includes(key))score=Math.max(score,.97);if(key&&key.length>=2){const q2=ngrams(query,2),k2=ngrams(key,2);let hit=0;for(const g of k2)if(q2.has(g))hit++;const coverage=k2.size?hit/k2.size:0;if(coverage>=.5)score=Math.max(score,.35+coverage*.5)}return Math.min(1,score)}
function autoLinkRole(query,c){const q=conceptSet(query),title=normalizeSearchText([c.title,c.text,(c.tags||[]).join(' ')].filter(Boolean).join(' ')),tc=conceptSet(title),type=String(c.type||'');if(q.has('first_frame')&&type==='image')return'first_frame';if(q.has('last_frame')&&type==='image')return'last_frame';if(tc.has('voice')&&type==='audio')return'voice_reference';if(tc.has('audio')&&type==='audio')return'audio_reference';if(tc.has('motion')&&type==='video')return'motion_reference';if(tc.has('video')&&type==='video')return'video_reference';if(tc.has('character')||type==='subject')return'character_reference';if(tc.has('scene'))return'scene_reference';if(tc.has('style'))return'style_reference';if(q.has('voice')&&type==='audio')return'voice_reference';if(q.has('audio')&&type==='audio')return'audio_reference';if(q.has('motion')&&type==='video')return'motion_reference';if(q.has('character')&&type==='image')return'character_reference';if(q.has('scene')&&type==='image')return'scene_reference';if(q.has('style')&&type==='image')return'style_reference';if(type==='text')return'prompt_context';if(type==='video')return'video_reference';if(type==='audio')return'audio_reference';if(type==='image')return'image_reference';return'reference'}

const STATIC_FILES = new Set([
  'index.html','models.html','app.js','models.js','ui-v2.js','ui-zh.js','three-runtime.js',
  'styles.css','models.css','canvas-ui-v1.css','canvas-ui-v2.css','ui-type-v2.css','workspace-canvas-v3.css',
  'blender_canvas_bridge.py'
]);
function serveStatic(req, res, pathname) {
  let relative;
  try{ relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.replace(/^\//,'')); }
  catch{return false}
  relative = path.normalize(relative);
  if (relative.includes('/') || relative.includes('\\') || !STATIC_FILES.has(relative)) return false;
  const file = path.resolve(ROOT, relative);
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  const ext = path.extname(file).toLowerCase();
  const mime = {
    '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
    '.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.glb':'model/gltf-binary','.gltf':'model/gltf+json'
  }[ext] || 'application/octet-stream';
  res.writeHead(200, {'Content-Type':mime,'Cache-Control':'no-cache'});
  fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    await ensureBoot();
    const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);const pathname=u.pathname;
    if(!enforceRateLimit(req,res))return;
    if(pathname==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,service:'canvas-provider-gateway',taskConcurrency:TASK_CONCURRENCY,queuePaused:taskQueuePaused,authEnabled:Boolean(ADMIN_PASSWORD)});
    if(pathname==='/api/queue'&&req.method==='GET'){const queued=store.listTasks({status:'queued',limit:300}).length;return json(res,200,{paused:taskQueuePaused,concurrency:TASK_CONCURRENCY,running:runningTasks,queued})}
    if(pathname==='/api/queue'&&req.method==='PUT'){const body=await readJson(req);taskQueuePaused=Boolean(body.paused);if(!taskQueuePaused)processTaskQueue();return json(res,200,{paused:taskQueuePaused,concurrency:TASK_CONCURRENCY,running:runningTasks})}
    if(pathname==='/api/auth/status'&&req.method==='GET')return json(res,200,{enabled:Boolean(ADMIN_PASSWORD),authenticated:!ADMIN_PASSWORD||verifySession(parseCookies(req).canvas_session)});
    if(pathname==='/api/auth/login'&&req.method==='POST'){
      const body=await readJson(req);if(!ADMIN_PASSWORD)return json(res,200,{ok:true,disabled:true});
      const a=Buffer.from(String(body.password||'')),b=Buffer.from(ADMIN_PASSWORD);const ok=a.length===b.length&&crypto.timingSafeEqual(a,b);if(!ok)return json(res,401,{error:'访问密码错误'});
      const token=signSession(Date.now()+SESSION_TTL_MS);res.setHeader('Set-Cookie',`canvas_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS/1000)}`);return json(res,200,{ok:true});
    }
    if(pathname==='/api/auth/logout'&&req.method==='POST'){res.setHeader('Set-Cookie','canvas_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true})}
    if(authRequired(req,pathname)&&!verifySession(parseCookies(req).canvas_session))return json(res,401,{error:'需要管理员访问密码'});
    if(!checkSameOrigin(req))return json(res,403,{error:'跨站写入请求已被拒绝'});

    if(pathname==='/api/blender/bridge/token'&&req.method==='GET')return json(res,200,{token:blenderBridgeToken(),plugin:'/blender_canvas_bridge.py',pollIntervalMs:1000});
    if(pathname==='/api/blender/bridge/push'&&req.method==='POST'){if(!blenderBridgeAuthorized(req,u))return json(res,401,{error:'Blender Bridge Token 无效'});const body=await readJson(req),direction=body.direction==='blender_to_canvas'?'blender_to_canvas':'canvas_to_blender',state=readBlenderBridgeState(),packet={version:Number(state[direction]?.version||0)+1,updatedAt:new Date().toISOString(),scene:body.scene||{},source:body.source||direction};state[direction]=packet;writeBlenderBridgeState(state);return json(res,200,{ok:true,packet});}
    if(pathname==='/api/blender/bridge/poll'&&req.method==='GET'){if(!blenderBridgeAuthorized(req,u))return json(res,401,{error:'Blender Bridge Token 无效'});const direction=u.searchParams.get('direction')==='blender_to_canvas'?'blender_to_canvas':'canvas_to_blender',since=Number(u.searchParams.get('since')||0),packet=readBlenderBridgeState()[direction];return json(res,200,{ok:true,changed:Boolean(packet&&Number(packet.version||0)>since),packet:packet||null});}
    if(pathname==='/api/upload'&&req.method==='POST'){
      const name=u.searchParams.get('name')||'upload.bin';const mime=String(req.headers['content-type']||'').split(';')[0];if(!/^(image|video|audio)\//.test(mime)&&mime!=='application/octet-stream')return json(res,415,{error:'只允许图片、视频、音频素材'});
      const file=outFile(safeExt(name,mime));const size=await writeUpload(req,file);if(!size){try{fs.unlinkSync(file)}catch{};return json(res,400,{error:'空文件'})}let meta=null;try{meta=await probeMediaFile(file)}catch{}return json(res,201,{ok:true,url:mediaUrl(file),name:path.basename(file),size,mime,meta});
    }
    if(pathname==='/api/media/process'&&req.method==='POST'){const body=await readJson(req);try{return json(res,200,{ok:true,...await processLocalMedia(body)})}catch(err){return json(res,400,{ok:false,error:err.message})}}
    if(pathname.startsWith('/media/')&&req.method==='GET'){
      const file=path.join(MEDIA_DIR,path.basename(pathname));if(!file.startsWith(MEDIA_DIR)||!fs.existsSync(file))return json(res,404,{error:'media not found'});
      const ext=path.extname(file).toLowerCase(),mime=mimeForExt(ext),size=fs.statSync(file).size,range=String(req.headers.range||'').match(/bytes=(\d*)-(\d*)/);
      if(range){const start=range[1]?Math.max(0,Number(range[1])):0,end=range[2]?Math.min(size-1,Number(range[2])):size-1;if(!Number.isFinite(start)||!Number.isFinite(end)||start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return}res.writeHead(206,{'Content-Type':mime,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1,'Cache-Control':'private,max-age=3600'});fs.createReadStream(file,{start,end}).pipe(res);return}
      res.writeHead(200,{'Content-Type':mime,'Content-Length':size,'Accept-Ranges':'bytes','Cache-Control':'private,max-age=3600'});fs.createReadStream(file).pipe(res);return;
    }

    if(pathname==='/api/adapters'&&req.method==='GET'){const providers=loadProvidersRaw();return json(res,200,{adapters:Object.entries(ADAPTER_CATALOG).map(([key,v])=>({key,...v})),models:providers.flatMap(p=>(p.models||[]).map(m=>({providerId:p.id,modelId:m.id,modality:m.modality,...adapterInfo(p,m)})))})}
    if(pathname==='/api/providers'&&req.method==='GET')return json(res,200,{providers:loadProvidersRaw().map(p=>({...publicProvider(p),models:(p.models||[]).map(m=>({...m,adapterResolved:adapterInfo(p,m)}))}))});
    if(pathname==='/api/providers'&&req.method==='POST'){
      const body=await readJson(req),list=loadProvidersRaw(),index=body.id?list.findIndex(p=>p.id===body.id):-1,saved=normalizeProvider(body,index>=0?list[index]:null);
      if(!saved.baseUrl)return json(res,400,{error:'Base URL 不能为空'});try{await validateOutboundUrl(saved.baseUrl,saved)}catch(err){return json(res,400,{error:err.message})}
      if(saved.models.some(m=>!m.id||!m.modality))return json(res,400,{error:'模型 ID 和类型不能为空'});if(index>=0)list[index]=saved;else list.push(saved);saveProvidersRaw(list);return json(res,200,{provider:publicProvider(saved)});
    }
    if(pathname==='/api/providers/test-config'&&req.method==='POST'){const body=await readJson(req);try{return json(res,200,await testProviderConfig(body))}catch(err){return json(res,502,{ok:false,error:err.message})}}
    if(pathname==='/api/providers/test-auth'&&req.method==='POST'){const body=await readJson(req);try{return json(res,200,await testProviderAuth(body))}catch(err){return json(res,502,{ok:false,error:err.message})}}
    if(pathname==='/api/providers/diagnose'&&req.method==='POST'){const body=await readJson(req);try{return json(res,200,await diagnoseProvider(body))}catch(err){return json(res,502,{ok:false,error:err.message})}}
    if(pathname==='/api/providers/discover-models'&&req.method==='POST'){const body=await readJson(req);try{return json(res,200,await discoverProviderModels(body))}catch(err){return json(res,502,{ok:false,error:err.message})}}
    const deleteProviderMatch=pathname.match(/^\/api\/providers\/([^/]+)$/);if(deleteProviderMatch&&req.method==='DELETE'){const id=decodeURIComponent(deleteProviderMatch[1]),list=loadProvidersRaw(),next=list.filter(p=>p.id!==id);if(next.length===list.length)return json(res,404,{error:'供应商不存在'});saveProvidersRaw(next);return json(res,200,{ok:true})}

    if(pathname==='/api/tasks'&&req.method==='GET'){const status=u.searchParams.get('status')||undefined;return json(res,200,{tasks:store.listTasks({status,limit:Math.min(300,Number(u.searchParams.get('limit')||100))}).map(taskPublic)})}
    if(pathname==='/api/tasks'&&req.method==='POST'){
      const body=await readJson(req),now=new Date().toISOString();const task={id:uid('task_'),status:'queued',progress:0,providerId:String(body.providerId||''),modelId:String(body.modelId||''),nodeType:String(body.nodeType||''),payload:body,output:null,error:null,createdAt:now,updatedAt:now,attempt:0,maxRetries:Math.max(0,Math.min(5,Number(body.maxRetries??1))),priority:Math.max(0,Math.min(100,Number(body.priority??50))),cancelRequested:false,logs:[]};
      if(!task.providerId||!task.modelId||!['text','image','video','audio','script'].includes(task.nodeType))return json(res,400,{error:'任务参数不完整'});
      const created=store.createTask(task);store.appendTaskLog(created.id,'任务进入持久队列');processTaskQueue();return json(res,202,{task:taskPublic(store.getTask(created.id))});
    }
    const taskMatch=pathname.match(/^\/api\/tasks\/([^/]+)$/);if(taskMatch){
      const id=decodeURIComponent(taskMatch[1]),task=store.getTask(id);if(!task)return json(res,404,{error:'任务不存在'});
      if(req.method==='GET')return json(res,200,{task:taskPublic(task)});
      if(req.method==='PATCH'){const body=await readJson(req);const priority=Math.max(0,Math.min(100,Number(body.priority??task.priority??50)));store.updateTask(id,{priority});store.appendTaskLog(id,`队列优先级调整为 ${priority}`);processTaskQueue();return json(res,200,{task:taskPublic(store.getTask(id))})}
      if(req.method==='DELETE'){store.updateTask(id,{cancelRequested:true,status:task.status==='queued'?'canceled':'cancelling'});store.appendTaskLog(id,'收到取消请求','warn');return json(res,200,{task:taskPublic(store.getTask(id))})}
    }
    const retryMatch=pathname.match(/^\/api\/tasks\/([^/]+)\/retry$/);if(retryMatch&&req.method==='POST'){const id=decodeURIComponent(retryMatch[1]),task=store.getTask(id);if(!task)return json(res,404,{error:'任务不存在'});store.updateTask(id,{status:'queued',progress:0,error:null,cancelRequested:false,attempt:0});store.appendTaskLog(id,'手动重试');processTaskQueue();return json(res,200,{task:taskPublic(store.getTask(id))})}

    if(pathname==='/api/projects'&&req.method==='GET')return json(res,200,{projects:store.listProjects(200)});
    if(pathname==='/api/projects'&&req.method==='POST'){const body=await readJson(req),id=body.id||uid('proj_'),now=new Date().toISOString();if(store.getProject(id))return json(res,409,{error:'项目 ID 已存在'});return json(res,201,{project:store.createProject({id,name:String(body.name||'未命名画布'),data:body.data||{},createdAt:now,updatedAt:now})})}
    const projectMatch=pathname.match(/^\/api\/projects\/([^/]+)$/);if(projectMatch){const id=decodeURIComponent(projectMatch[1]);if(req.method==='GET'){const project=store.getProject(id);return project?json(res,200,{project}):json(res,404,{error:'项目不存在'})}if(req.method==='PUT'){const body=await readJson(req),project=store.saveProject(id,{name:body.name,data:body.data,forceSnapshot:Boolean(body.forceSnapshot)});return project?json(res,200,{project}):json(res,404,{error:'项目不存在'})}if(req.method==='DELETE')return store.deleteProject(id)?json(res,200,{ok:true}):json(res,404,{error:'项目不存在'})}
    const versionsMatch=pathname.match(/^\/api\/projects\/([^/]+)\/versions$/);if(versionsMatch&&req.method==='GET')return json(res,200,{versions:store.listProjectVersions(decodeURIComponent(versionsMatch[1]),50)});
    const restoreMatch=pathname.match(/^\/api\/projects\/([^/]+)\/restore\/(\d+)$/);if(restoreMatch&&req.method==='POST'){const project=store.restoreProjectVersion(decodeURIComponent(restoreMatch[1]),Number(restoreMatch[2]));return project?json(res,200,{project}):json(res,404,{error:'项目版本不存在'})}

    if(pathname==='/api/autolink'&&req.method==='POST'){
      const body=await readJson(req),q=normalizeSearchText(body.text||''),cands=Array.isArray(body.candidates)?body.candidates:[];const scored=cands.map(c=>({...c,score:candidateSemanticScore(q,c),role:autoLinkRole(q,c)})).filter(x=>x.score>.13).sort((a,b)=>b.score-a.score).slice(0,10);return json(res,200,{matches:scored,concepts:[...conceptSet(q)]});
    }

    if(serveStatic(req,res,pathname))return;json(res,404,{error:'Not found'});
  } catch(err){json(res,500,{error:err?.message||String(err)})}
});
server.listen(PORT, HOST, () => {
  console.log(`Canvas Studio running at http://${HOST}:${PORT}`);
  console.log(`Provider data: ${PROVIDERS_FILE}`);console.log(`Persistent store: ${path.join(DATA_DIR,'canvas.sqlite')}`);
  ensureBoot().then(() => processTaskQueue());
});


