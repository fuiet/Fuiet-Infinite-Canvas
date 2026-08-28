from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]

def replace_once(path, old, new, label):
    text=path.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'missing patch anchor: {label}')
    path.write_text(text.replace(old,new,1),encoding='utf-8')

app=ROOT/'app.js'
replace_once(app,
"""    const normalized=globalThis.CanvasImageRequestParameters?.normalize?.(raw)||raw;
    const provider=providerById(n.providerId),model=modelForNode(n),resolver=globalThis.CanvasModelImageCapabilities;
    if(provider&&model&&resolver?.normalizeSelection){const selected=resolver.normalizeSelection(provider,model,normalized),{imageCapabilities,...clean}=selected;return clean}
    return normalized;
""",
"""    const provider=providerById(n.providerId),model=modelForNode(n),resolver=globalThis.CanvasModelImageCapabilities;
    if(provider&&model&&resolver?.normalizeSelection){const selected=resolver.normalizeSelection(provider,model,raw),{imageCapabilities,...clean}=selected;return clean}
    return globalThis.CanvasImageRequestParameters?.normalize?.(raw)||raw;
""",
'image resolver must run before generic normalization')

runtime=ROOT/'browser-runtime.js'
replace_once(runtime,
"""const ImageCapabilities=globalThis.CanvasModelImageCapabilities;
const VideoParams=globalThis.CanvasVideoRequestParameters;
""",
"""const ImageCapabilities=globalThis.CanvasModelImageCapabilities;
const ImageOutputDimensions=globalThis.CanvasImageOutputDimensions;
const VideoParams=globalThis.CanvasVideoRequestParameters;
""",
'output dimension helper import')

normalize_block="""async function normalizeGeneratedOutput(value,modality,provider){
  if(value==null)return value;
  let text=typeof value==='string'?value.trim():value;
  if(modality==='image'&&typeof text==='string'&&/^data:image\\//i.test(text)){
    try{const blob=await (await rawFetch(text)).blob(),stored=await storeMediaBlob(blob,{name:'generated-image'});return stored.url}catch{}
  }
  if(typeof text==='string'&&text.startsWith('/')&&!text.startsWith('/__browser_media/')&&!text.startsWith('/media/')){
    try{return joinUrl(provider?.baseUrl||location.origin,text)}catch{}
  }
  return text;
}
function refsForRequest(refs=[]){return (Array.isArray(refs)?refs:[]).map(r=>({role:r.role||r.semanticRole||r.kind||'reference',type:r.type||r.kind||'',url:r.url||r.outputUrl||'',text:r.text||'',title:r.title||''})).filter(r=>r.url||r.text)}
"""
helpers="""async function normalizeGeneratedOutput(value,modality,provider){
  if(value==null)return value;
  let text=typeof value==='string'?value.trim():value;
  if(modality==='image'&&typeof text==='string'&&/^data:image\\//i.test(text)){
    try{const blob=await (await rawFetch(text)).blob(),stored=await storeMediaBlob(blob,{name:'generated-image'});return stored.url}catch{}
  }
  if(typeof text==='string'&&text.startsWith('/')&&!text.startsWith('/__browser_media/')&&!text.startsWith('/media/')){
    try{return joinUrl(provider?.baseUrl||location.origin,text)}catch{}
  }
  return text;
}
function imageTargetSelection(provider,model,parameters={}){
  const selection=ImageCapabilities?.normalizeSelection?.(provider||{},model||{},parameters||{});
  const target=ImageOutputDimensions?.parseSize?.(selection?.size||parameters?.size||'');
  return target?{...target,selection}:null;
}
async function generatedImageBlob(value){
  const text=String(value||'').trim();if(!text)throw new Error('生成图片地址为空，无法校验尺寸');
  let res;
  if(/^https?:\\/\\//i.test(text)||text.startsWith('//')){const url=text.startsWith('//')?`${location.protocol}${text}`:text;res=await providerFetch(url,{method:'GET',headers:{accept:'image/*'}})}
  else res=await rawFetch(text,{method:'GET',headers:{accept:'image/*'}});
  if(!res?.ok)throw new Error(`无法读取生成图片以校验尺寸${res?.status?`（HTTP ${res.status}）`:''}`);
  const blob=await res.blob();if(!String(blob.type||'').toLowerCase().startsWith('image/'))throw new Error('生成结果不是可校验的图片文件');return blob;
}
async function decodeGeneratedImage(blob){
  if(typeof createImageBitmap==='function'){const bitmap=await createImageBitmap(blob);return{image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()}}
  if(typeof Image!=='function'||typeof URL==='undefined')throw new Error('当前浏览器无法读取生成图片像素尺寸');
  return await new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),img=new Image();img.onload=()=>resolve({image:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>URL.revokeObjectURL(url)});img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('生成图片解码失败'))};img.src=url});
}
async function encodedCanvasBlob(canvas,type){
  const mime=ImageOutputDimensions?.outputMimeType?.(type)||'image/png';
  if(typeof canvas.convertToBlob==='function')return canvas.convertToBlob({type:mime,quality:.95});
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('纠正后的图片编码失败')),mime,.95));
}
async function enforceGeneratedImageDimensions(value,provider,model,parameters={}){
  const target=imageTargetSelection(provider,model,parameters);if(!target)return{value,corrected:false,targetSize:'',sourceSize:'',finalSize:'',policy:''};
  const targetSize=target.size,blob=await generatedImageBlob(value),decoded=await decodeGeneratedImage(blob),sourceSize=`${decoded.width}x${decoded.height}`;
  try{
    if(ImageOutputDimensions?.sameSize?.(decoded.width,decoded.height,target))return{value,corrected:false,targetSize,sourceSize,finalSize:sourceSize,policy:'verified'};
    const crop=ImageOutputDimensions?.cropRect?.(decoded.width,decoded.height,target.width,target.height);if(!crop)throw new Error('无法计算图片尺寸纠正规则');
    let canvas;if(typeof OffscreenCanvas==='function')canvas=new OffscreenCanvas(target.width,target.height);else{if(typeof document==='undefined')throw new Error('当前浏览器不支持图片尺寸纠正');canvas=document.createElement('canvas');canvas.width=target.width;canvas.height=target.height}
    const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('无法创建图片尺寸纠正画布');
    ctx.drawImage(decoded.image,crop.sx,crop.sy,crop.sWidth,crop.sHeight,0,0,target.width,target.height);
    const corrected=await encodedCanvasBlob(canvas,blob.type),stored=await storeMediaBlob(corrected,{name:`generated-image-${targetSize}`});
    return{value:stored.url,corrected:true,targetSize,sourceSize,finalSize:targetSize,policy:'center-crop-resize'};
  }finally{decoded.close?.()}
}
function imageDimensionTaskPatch(info){return info?{requestedImageSize:info.targetSize||'',sourceImageSize:info.sourceSize||'',finalImageSize:info.finalSize||'',imageDimensionCorrected:info.corrected===true,imageDimensionPolicy:info.policy||''}:{}}
function refsForRequest(refs=[]){return (Array.isArray(refs)?refs:[]).map(r=>({role:r.role||r.semanticRole||r.kind||'reference',type:r.type||r.kind||'',url:r.url||r.outputUrl||'',text:r.text||'',title:r.title||''})).filter(r=>r.url||r.text)}
"""
replace_once(runtime,normalize_block,helpers,'generated image dimension helpers')

replace_once(runtime,
"""    if(created.kind==='blob')return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(created.value,task.nodeType)});
""",
"""    if(created.kind==='blob'){
      const modality=normalizeMod(task.nodeType);let value=created.value,dimensionInfo=null;
      if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(value,provider,model,task.parameters||{});value=dimensionInfo.value}
      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,modality),...imageDimensionTaskPatch(dimensionInfo)});
    }
""",
'direct binary image dimension validation')

replace_once(runtime,
"""    value=await normalizeGeneratedOutput(value,modality,provider);
    if(modality==='image'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到图片结果字段');
    const upstreamSize=modality==='image'?imageResponseSize(raw):'';
    return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,modality),...(upstreamSize?{upstreamSize}:{})});
""",
"""    value=await normalizeGeneratedOutput(value,modality,provider);
    if(modality==='image'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到图片结果字段');
    let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(value,provider,model,task.parameters||{});value=dimensionInfo.value}
    const upstreamSize=modality==='image'?imageResponseSize(raw):'';
    return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,modality),...imageDimensionTaskPatch(dimensionInfo),...(upstreamSize?{upstreamSize}:{})});
""",
'sync image dimension validation')

replace_once(runtime,
"""      const modality=normalizeMod(task.nodeType);output=await normalizeGeneratedOutput(output,modality,provider);
      if(modality==='image'&&!validMediaOutput(output))throw new Error('上游任务已成功，但未识别到图片结果字段');
      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(output,modality)});
""",
"""      const modality=normalizeMod(task.nodeType);output=await normalizeGeneratedOutput(output,modality,provider);
      if(modality==='image'&&!validMediaOutput(output))throw new Error('上游任务已成功，但未识别到图片结果字段');
      let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(output,provider,model,task.parameters||{});output=dimensionInfo.value}
      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(output,modality),...imageDimensionTaskPatch(dimensionInfo)});
""",
'async image dimension validation')

index=ROOT/'index.html'
replace_once(index,
"""  <script src=\"./image-request-parameters.js?v=20260828-model-capabilities-1\"></script>
  <script src=\"./model-image-capabilities.js?v=20260828-model-capabilities-1\"></script>
  <script src=\"./video-request-parameters.js?v=20260828-video-runtime-1\"></script>
  <script src=\"./browser-runtime.js?v=20260828-model-capabilities-1\"></script>
  <script src=\"./browser-storage-manager.js?v=20260828-storage-manager-1\"></script>
  <script src=\"./browser-bootstrap.js?v=20260828-model-capabilities-1\"></script>
""",
"""  <script src=\"./image-request-parameters.js?v=20260828-image-dimension-contract-1\"></script>
  <script src=\"./model-image-capabilities.js?v=20260828-image-dimension-contract-1\"></script>
  <script src=\"./image-output-dimensions.js?v=20260828-image-dimension-contract-1\"></script>
  <script src=\"./video-request-parameters.js?v=20260828-video-runtime-1\"></script>
  <script src=\"./browser-runtime.js?v=20260828-image-dimension-contract-1\"></script>
  <script src=\"./browser-storage-manager.js?v=20260828-storage-manager-1\"></script>
  <script src=\"./browser-bootstrap.js?v=20260828-image-dimension-contract-1\"></script>
""",
'index image dimension cache bust')

bootstrap=ROOT/'browser-bootstrap.js'
replace_once(bootstrap,"const v='20260828-model-capabilities-1';","const v='20260828-image-dimension-contract-1';",'bootstrap cache bust')

package_path=ROOT/'package.json'
pkg=json.loads(package_path.read_text(encoding='utf-8'))
check=pkg['scripts']['check']
if 'node --check image-output-dimensions.js' not in check:
    check=check.replace('node --check model-image-capabilities.js','node --check model-image-capabilities.js && node --check image-output-dimensions.js')
pkg['scripts']['check']=check
package_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print('image output dimension contract applied')
