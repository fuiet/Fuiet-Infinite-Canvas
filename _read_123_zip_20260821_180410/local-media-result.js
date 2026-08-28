const fs = require('fs');
const path = require('path');

function localFileFromMediaUrl(mediaDir,url){
  const root=path.resolve(mediaDir);
  const match=String(url||'').match(/^\/media\/([A-Za-z0-9._-]+)$/);
  if(!match)throw new Error('媒体处理返回了无效的本地结果地址');
  const file=path.resolve(root,match[1]);
  if(file!==root&&!file.startsWith(root+path.sep))throw new Error('媒体处理结果路径越界');
  return file;
}

function verifyLocalMediaProcessResult(result,mediaDir){
  if(!result||typeof result!=='object')throw new Error('媒体处理没有返回有效结果');
  // Probe is intentionally metadata-only; every transforming operation must return files.
  if(result.meta&&!Object.prototype.hasOwnProperty.call(result,'outputs'))return result;
  if(!Array.isArray(result.outputs)||result.outputs.length===0)throw new Error('媒体处理没有生成任何输出文件');
  for(const output of result.outputs){
    if(!output||typeof output!=='object')throw new Error('媒体处理返回了无效输出');
    const file=localFileFromMediaUrl(mediaDir,output.url);
    let stat;
    try{stat=fs.statSync(file);}catch{throw new Error(`媒体处理结果文件不存在：${path.basename(file)}`);}
    if(!stat.isFile()||stat.size<=0)throw new Error(`媒体处理结果文件为空：${path.basename(file)}`);
  }
  return result;
}

module.exports={verifyLocalMediaProcessResult,localFileFromMediaUrl};
