from pathlib import Path
p=Path('_read_123_zip_20260821_180410/functions/api/[[path]].js')
s=p.read_text(encoding='utf-8')
old="""  const headers=sanitizeHeaders(body?.headers||{});\n  let payload=body?.body;\n  if(payload!==null&&payload!==undefined&&typeof payload!=='string')return json({error:'代理请求体必须是文本或 JSON 字符串'},400);\n  if(['GET','HEAD'].includes(method))payload=undefined;"""
new="""  const headers=sanitizeHeaders(body?.headers||{});\n  let payload=body?.body;\n  const bodyType=String(body?.bodyType||'text');\n  if(bodyType==='form-data'){\n    const form=new FormData();\n    for(const item of Array.isArray(body?.formData)?body.formData:[]){\n      if(item?.kind==='file'){\n        try{\n          const bytes=Uint8Array.from(atob(String(item.base64||'')),c=>c.charCodeAt(0));\n          form.append(String(item.name||'file'),new Blob([bytes],{type:String(item.type||'application/octet-stream')}),String(item.filename||'upload.bin'));\n        }catch{return json({error:'代理 multipart 文件编码无效'},400)}\n      }else form.append(String(item?.name||'field'),String(item?.value||''));\n    }\n    headers.delete('content-type');\n    headers.delete('content-length');\n    payload=form;\n  }else if(payload!==null&&payload!==undefined&&typeof payload!=='string')return json({error:'代理请求体必须是文本、JSON 字符串或 multipart'},400);\n  if(['GET','HEAD'].includes(method))payload=undefined;"""
if old not in s:
    if "bodyType==='form-data'" not in s: raise SystemExit('proxy anchor missing')
else:
    s=s.replace(old,new)
    p.write_text(s,encoding='utf-8')
print('video proxy multipart followup applied')
