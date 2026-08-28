const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'runtime-tools');
const MANIFEST = path.join(TOOLS, 'tool-manifest.json');

function fail(message){
  console.error(`[desktop:verify] ${message}`);
  process.exit(1);
}
function sha256(file){
  const hash=crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}
function verifyExecutable(label,file){
  if(!fs.existsSync(file))fail(`${label} 不存在：${file}`);
  if(fs.statSync(file).size<100*1024)fail(`${label} 文件异常过小：${file}`);
  try{
    execFileSync(file,['-version'],{stdio:'pipe',windowsHide:true,timeout:15000,env:process.env});
  }catch(error){fail(`${label} 无法运行：${error?.message||error}`);}
}

if(process.platform!=='win32')fail('Windows 桌面运行时校验必须在 Windows 上执行。');
if(!fs.existsSync(MANIFEST))fail('缺少 runtime-tools/tool-manifest.json，请先运行 npm run desktop:prepare:win。');
let manifest;
try{manifest=JSON.parse(fs.readFileSync(MANIFEST,'utf8').replace(/^\uFEFF/,''));}catch(error){fail(`媒体工具清单无法解析：${error.message}`);}

const ffmpeg=path.join(TOOLS,...String(manifest?.ffmpeg?.executable||'').split('/'));
const ffprobe=path.join(TOOLS,...String(manifest?.ffmpeg?.probeExecutable||'').split('/'));
const magick=path.join(TOOLS,...String(manifest?.imagemagick?.executable||'').split('/'));
verifyExecutable('FFmpeg',ffmpeg);
verifyExecutable('FFprobe',ffprobe);
verifyExecutable('ImageMagick',magick);

const notices=path.join(TOOLS,'THIRD_PARTY_NOTICES.txt');
if(!fs.existsSync(notices)||fs.statSync(notices).size<100)fail('缺少第三方运行时许可说明。');
if(!manifest?.ffmpeg?.version||!manifest?.imagemagick?.version)fail('媒体工具清单缺少版本信息。');

console.log('[desktop:verify] Windows 媒体运行时完整，可进入 Electron 打包。');
console.log(`[desktop:verify] ffmpeg=${manifest.ffmpeg.version}, imagemagick=${manifest.imagemagick.version}`);
console.log(`[desktop:verify] manifest sha256=${sha256(MANIFEST)}`);
