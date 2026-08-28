from pathlib import Path

# Temporary branch-only patch helper. Delete after server.js is committed.
ROOT=Path(__file__).resolve().parents[1]
SERVER=ROOT/'_read_123_zip_20260821_180410'/'server.js'
text=SERVER.read_text(encoding='utf-8')

old_require="const { CanvasStore } = require('./store');\n"
new_require="const { CanvasStore } = require('./store');\nconst { verifyLocalMediaProcessResult } = require('./local-media-result');\n"
if old_require in text and "require('./local-media-result')" not in text:
    text=text.replace(old_require,new_require,1)
elif "require('./local-media-result')" not in text:
    raise SystemExit('store require marker missing')

old="if(pathname==='/api/media/process'&&req.method==='POST'){const body=await readJson(req);try{return json(res,200,{ok:true,...await processLocalMedia(body)})}catch(err){return json(res,400,{ok:false,error:err.message})}}"
new="if(pathname==='/api/media/process'&&req.method==='POST'){const body=await readJson(req);try{const processed=await processLocalMedia(body);const verified=verifyLocalMediaProcessResult(processed,MEDIA_DIR);return json(res,200,{ok:true,...verified})}catch(err){return json(res,400,{ok:false,error:err.message})}}"
if old in text:
    text=text.replace(old,new,1)
elif 'verifyLocalMediaProcessResult(processed,MEDIA_DIR)' not in text:
    raise SystemExit('media process route marker missing')

SERVER.write_text(text,encoding='utf-8')
print('local media result verification patch applied')
