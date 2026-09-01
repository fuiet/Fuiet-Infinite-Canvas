from pathlib import Path
import re
ROOT=Path('_read_123_zip_20260821_180410')
app=ROOT/'app.js'
s=app.read_text(encoding='utf-8')

# 1. Add selected Shot production node helper after latestShotProductionNode.
anchor="""  function productionStatusMeta(node){"""
if anchor not in s: raise SystemExit('productionStatusMeta anchor missing')
helper=r'''  function selectedShotProductionNode(scriptNode,shot,type=''){
    if(!scriptNode||!shot)return null;const nodes=shotProductionNodes(scriptNode.id,shot.id,type),key=type==='video'?'selectedVideoNodeId':'selectedImageNodeId',selectedId=shot.outputs?.[key],selected=selectedId&&nodes.find(n=>n.id===selectedId);return selected||latestShotProductionNode(scriptNode.id,shot.id,type);
  }
  function setSelectedShotProductionNode(shot,type,nodeId){
    if(!shot||!nodeId)return;shot.outputs=shot.outputs||{imageNodeIds:[],videoNodeIds:[],selectedImageNodeId:'',selectedVideoNodeId:''};const key=type==='video'?'selectedVideoNodeId':'selectedImageNodeId',listKey=type==='video'?'videoNodeIds':'imageNodeIds';shot.outputs[listKey]=[...new Set([...(shot.outputs[listKey]||[]),nodeId])];shot.outputs[key]=nodeId;
  }
  function shotOutputNodePickerHtml(scriptNode,shot,type){
    const nodes=shotProductionNodes(scriptNode.id,shot.id,type);if(nodes.length<2)return'';const current=selectedShotProductionNode(scriptNode,shot,type);return `<select data-shot-output-select data-shot-id="${shot.id}" data-shot-type="${type}" title="当前采用的${type==='video'?'视频':'分镜图'}生产节点">${nodes.map((node,i)=>`<option value="${node.id}" ${node.id===current?.id?'selected':''}>采用 ${type==='video'?'视频':'分镜图'} ${i+1} · ${escapeHtml(productionStatusMeta(node).label)}</option>`).join('')}</select>`;
  }
'''
s=s.replace(anchor,helper+anchor,1)

# 2. Replace Shot production cell to use selected node and picker.
pat=r"  function shotProductionCellHtml\(scriptNode,shot\)\{.*?\n  function focusShotProductionNode"
m=re.search(pat,s,re.S)
if not m: raise SystemExit('shotProductionCellHtml block missing')
new=r'''  function shotProductionCellHtml(scriptNode,shot){
    const img=selectedShotProductionNode(scriptNode,shot,'image'),vid=selectedShotProductionNode(scriptNode,shot,'video'),im=productionStatusMeta(img),vm=productionStatusMeta(vid);return `<div class="shot-production-cell"><button data-shot-locate="${shot.id}" data-shot-type="image" class="${im.key}" ${img?'':'disabled'}>${uiIcon('image')}<span>图 · ${im.label}${img&&nodeResultVersions(img).length>1?` ${nodeResultVersions(img).length}候选`:''}</span></button>${shotOutputNodePickerHtml(scriptNode,shot,'image')}<button data-shot-locate="${shot.id}" data-shot-type="video" class="${vm.key}" ${vid?'':'disabled'}>${uiIcon('video')}<span>视频 · ${vm.label}${vid&&nodeResultVersions(vid).length>1?` ${nodeResultVersions(vid).length}候选`:''}</span></button>${shotOutputNodePickerHtml(scriptNode,shot,'video')}<span><button data-shot-regenerate="${shot.id}" data-shot-type="image" title="重新生成当前采用的分镜图">${uiIcon('refresh')}</button><button data-shot-regenerate="${shot.id}" data-shot-type="video" title="重新生成当前采用的视频">${uiIcon('refresh')}</button></span></div>`;
  }
  function focusShotProductionNode'''
s=s[:m.start()]+new+s[m.end():]

# 3. Focus selected node instead of newest node.
s=s.replace("const node=latestShotProductionNode(scriptNode.id,shotId,type);if(!node)return showToast", "const d=ensureScriptData(scriptNode),shot=d.shots.find(s=>s.id===shotId),node=selectedShotProductionNode(scriptNode,shot,type);if(!node)return showToast",1)

# 4. Only true Shot fields trigger dirty; selectors have dedicated handlers.
old="$$('[data-shot-row] input,[data-shot-row] textarea,[data-shot-row] select',featureModal).forEach(x=>x.onchange=()=>{const row=x.closest('[data-shot-row]'),shot=d.shots.find(s=>s.id===row?.dataset.shotRow);markScriptShotDirty(shot,'镜头信息已修改');scriptWorkflowInvalidate(d,'shots');saveRows()});"
new="$$('[data-shot-row] [data-shot]',featureModal).forEach(x=>x.onchange=()=>{const row=x.closest('[data-shot-row]'),shot=d.shots.find(s=>s.id===row?.dataset.shotRow);markScriptShotDirty(shot,'镜头信息已修改');scriptWorkflowInvalidate(d,'shots');saveRows()});"
if old not in s: raise SystemExit('generic shot change binding missing')
s=s.replace(old,new,1)

# 5. Bind Shot-level selected production node picker before locate handlers.
anchor="$$('[data-shot-locate]',featureModal).forEach(b=>b.onclick=()=>{saveRows();focusShotProductionNode(n,b.dataset.shotLocate,b.dataset.shotType)});"
if anchor not in s: raise SystemExit('shot locate binding missing')
bind="$$('[data-shot-output-select]',featureModal).forEach(sel=>sel.onchange=()=>{const shot=d.shots.find(x=>x.id===sel.dataset.shotId);if(!shot)return;setSelectedShotProductionNode(shot,sel.dataset.shotType,sel.value);saveState();showToast(`Shot ${shot.no} 已切换当前采用的${sel.dataset.shotType==='video'?'视频':'分镜图'}结果`);rerender()});"+anchor
s=s.replace(anchor,bind,1)

# 6. Use selected current image for batch preview and new video first-frame edge.
s=s.replace("const image=type==='video'?latestShotProductionNode(n.id,shot.id,'image'):null;", "const image=type==='video'?selectedShotProductionNode(n,shot,'image'):null;",1)
s=s.replace("if(type==='video'){const imageNode=latestShotProductionNode(scriptNode.id,shot.id,'image');", "if(type==='video'){const imageNode=selectedShotProductionNode(scriptNode,shot,'image');",1)

# 7. Regeneration should target current selected production node; selected first frame too.
s=s.replace("let node=latestShotProductionNode(scriptNode.id,shot.id,type);", "let node=selectedShotProductionNode(scriptNode,shot,type);",1)
s=s.replace("const imageNode=latestShotProductionNode(scriptNode.id,shot.id,'image');if(imageNode)createEdge", "const imageNode=selectedShotProductionNode(scriptNode,shot,'image');if(imageNode)createEdge",1)

# 8. Replace production/quality/baseline reads that must respect selected node.
s=s.replace("const image=latestShotProductionNode(scriptNode.id,shot.id,'image'),video=latestShotProductionNode(scriptNode.id,shot.id,'video');", "const image=selectedShotProductionNode(scriptNode,shot,'image'),video=selectedShotProductionNode(scriptNode,shot,'video');",2)
s=s.replace("const node=latestShotProductionNode(scriptNode.id,shot.id,type),q=ensureShotQuality(scriptNode,shot);", "const node=selectedShotProductionNode(scriptNode,shot,type),q=ensureShotQuality(scriptNode,shot);",1)
s=s.replace("const img=latestShotProductionNode(scriptNode.id,shot.id,'image'),vid=latestShotProductionNode(scriptNode.id,shot.id,'video');return{shotId:shot.id,no:shot.no,imageVersionId:activeResultVersionId(img),videoVersionId:activeResultVersionId(vid)}", "const img=selectedShotProductionNode(scriptNode,shot,'image'),vid=selectedShotProductionNode(scriptNode,shot,'video');return{shotId:shot.id,no:shot.no,imageNodeId:img?.id||'',videoNodeId:vid?.id||'',imageVersionId:activeResultVersionId(img),videoVersionId:activeResultVersionId(vid)}",1)

# 9. When quality passes, lock Shot-level selected node to reviewed node too.
old="q.approvedVersionIds[type]=status==='pass'?selected:'';if(freeze)node.frozen=true;"
new="q.approvedVersionIds[type]=status==='pass'?selected:'';if(status==='pass')setSelectedShotProductionNode(shot,type,node.id);if(freeze)node.frozen=true;"
if old not in s: raise SystemExit('quality pass anchor missing')
s=s.replace(old,new,1)

app.write_text(s,encoding='utf-8')

t=ROOT/'tests'/'script-selected-output.test.mjs'
t.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('Shot output uses explicit selected production node',()=>{
  assert.match(app,/function selectedShotProductionNode\(scriptNode,shot,type=''\)/);
  assert.match(app,/selectedVideoNodeId/);
  assert.match(app,/selectedImageNodeId/);
  assert.match(app,/data-shot-output-select/);
  assert.match(app,/setSelectedShotProductionNode\(shot,sel\.dataset\.shotType,sel\.value\)/);
});
test('video first frame and production review use selected Shot image',()=>{
  assert.match(app,/selectedShotProductionNode\(scriptNode,shot,'image'\)/);
  assert.match(app,/selectedShotProductionNode\(n,shot,'image'\)/);
  assert.match(app,/const node=selectedShotProductionNode\(scriptNode,shot,type\),q=ensureShotQuality/);
});
test('non-shot selectors no longer dirty prompt data',()=>{
  assert.match(app,/\$\$\('\[data-shot-row\] \[data-shot\]'[\s\S]*镜头信息已修改/);
  assert.doesNotMatch(app,/\[data-shot-row\] input,\[data-shot-row\] textarea,\[data-shot-row\] select/);
});
test('production baseline records selected node identity',()=>{
  assert.match(app,/imageNodeId:img\?\.id\|\|''/);
  assert.match(app,/videoNodeId:vid\?\.id\|\|''/);
});
''',encoding='utf-8')
print('patched selected Shot output')
