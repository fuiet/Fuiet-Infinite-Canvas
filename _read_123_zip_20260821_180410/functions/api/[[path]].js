/* Cloudflare Pages preview transport only.
 * No provider/API key/project/task/media state is stored here.
 * The browser runtime owns all preview persistence; this function only provides a
 * same-origin CORS escape hatch for upstream provider requests.
 */
const HOP_BY_HOP = new Set([
  'host','cookie','set-cookie','content-length','connection','keep-alive',
  'proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade',
  'cf-connecting-ip','cf-ipcountry','cf-ray','cf-visitor','x-forwarded-for','x-forwarded-proto'
]);

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  }});
}

function isPrivateIpv4(host){
  const p=host.split('.').map(Number);
  if(p.length!==4||p.some(x=>!Number.isInteger(x)||x<0||x>255))return false;
  return p[0]===0||p[0]===10||p[0]===127||p[0]>=224||
    (p[0]===100&&p[1]>=64&&p[1]<=127)||
    (p[0]===169&&p[1]===254)||
    (p[0]===172&&p[1]>=16&&p[1]<=31)||
    (p[0]===192&&p[1]===168);
}
function validateTarget(value){
  let u;try{u=new URL(String(value||''))}catch{throw new Error('供应商 URL 无效')}
  if(!['https:','http:'].includes(u.protocol))throw new Error('仅允许 HTTP/HTTPS 供应商');
  if(u.username||u.password)throw new Error('供应商 URL 不允许包含用户名或密码');
  const host=u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
  if(!host||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal'))throw new Error('不允许代理本机或私有主机');
  if(isPrivateIpv4(host)||host==='::1'||host==='::'||host.startsWith('fc')||host.startsWith('fd')||host.startsWith('fe80:'))throw new Error('不允许代理私有/保留 IP');
  return u;
}
function sanitizeHeaders(input){
  const out=new Headers();
  for(const [k,v] of Object.entries(input||{})){
    const n=String(k).toLowerCase();
    if(HOP_BY_HOP.has(n)||n.startsWith('cf-')||n.startsWith('x-forwarded-'))continue;
    out.set(k,String(v));
  }
  return out;
}
function responseHeaders(source){
  const out=new Headers();
  for(const [k,v] of source.entries()){
    const n=k.toLowerCase();
    if(HOP_BY_HOP.has(n)||n==='set-cookie'||n.startsWith('cf-'))continue;
    out.set(k,v);
  }
  out.set('cache-control','no-store');
  out.set('x-content-type-options','nosniff');
  return out;
}
async function proxy(request){
  if(request.method!=='POST')return json({error:'代理接口只允许 POST'},405);
  const requestOrigin=new URL(request.url).origin;
  const origin=String(request.headers.get('origin')||'');
  if(origin&&origin!==requestOrigin)return json({error:'只允许本站页面调用代理'},403);
  if(request.headers.get('x-canvas-proxy')!=='1')return json({error:'缺少画布代理标记'},403);

  let body;try{body=await request.json()}catch{return json({error:'代理请求必须是 JSON'},400)}
  let current;try{current=validateTarget(body?.url)}catch(e){return json({error:e.message},400)}
  const method=String(body?.method||'GET').toUpperCase();
  if(!['GET','POST','PUT','PATCH','DELETE','HEAD'].includes(method))return json({error:'不支持的上游请求方法'},405);
  const headers=sanitizeHeaders(body?.headers||{});
  let payload=body?.body;
  const bodyType=String(body?.bodyType||'text');
  if(bodyType==='form-data'){
    const form=new FormData();
    for(const item of Array.isArray(body?.formData)?body.formData:[]){
      if(item?.kind==='file'){
        try{
          const bytes=Uint8Array.from(atob(String(item.base64||'')),c=>c.charCodeAt(0));
          form.append(String(item.name||'file'),new Blob([bytes],{type:String(item.type||'application/octet-stream')}),String(item.filename||'upload.bin'));
        }catch{return json({error:'代理 multipart 文件编码无效'},400)}
      }else form.append(String(item?.name||'field'),String(item?.value||''));
    }
    headers.delete('content-type');
    headers.delete('content-length');
    payload=form;
  }else if(payload!==null&&payload!==undefined&&typeof payload!=='string')return json({error:'代理请求体必须是文本、JSON 字符串或 multipart'},400);
  if(['GET','HEAD'].includes(method))payload=undefined;

  const originalOrigin=current.origin;
  for(let redirects=0;redirects<4;redirects++){
    const upstream=await fetch(current.toString(),{method,headers,body:payload,redirect:'manual'});
    if([301,302,303,307,308].includes(upstream.status)&&upstream.headers.get('location')){
      let next;try{next=validateTarget(new URL(upstream.headers.get('location'),current).toString())}catch(e){return json({error:e.message},502)}
      if(next.origin!==originalOrigin)return json({error:'已阻止携带供应商认证信息跨域重定向'},502);
      current=next;
      continue;
    }
    return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers:responseHeaders(upstream.headers)});
  }
  return json({error:'上游重定向次数过多'},502);
}

export async function onRequest(context){
  const pathname=new URL(context.request.url).pathname;
  if(pathname==='/api/health')return json({ok:true,service:'fuiet-stateless-preview-proxy',persistence:false});
  if(pathname==='/api/proxy'){
    try{return await proxy(context.request)}catch(error){return json({error:String(error?.message||error)},502)}
  }
  return json({error:'此 Cloudflare 部署只负责网页预览和无状态代理；数据接口由浏览器本地 Runtime 处理'},410);
}
