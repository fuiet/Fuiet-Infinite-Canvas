from pathlib import Path
import re
ROOT=Path('_read_123_zip_20260821_180410')
app=ROOT/'app.js'
s=app.read_text(encoding='utf-8')

# Helper renders stable-id asset chips + picker for each Shot.
anchor="  function scriptShotsHtml(n,d){"
if anchor not in s: raise SystemExit('scriptShotsHtml anchor missing')
helper=r'''  function shotAssetRefsCellHtml(d,shot){
    const cat=scriptAssetCatalog(d),ids=matchShotAssets(shot,d),selected=ids.map(id=>cat.find(a=>a.id===id)).filter(Boolean),remaining=cat.filter(a=>!ids.includes(a.id));
    return `<div class="shot-asset-ref-cell"><div class="shot-asset-chips">${selected.map(a=>`<button type="button" class="shot-asset-chip" data-remove-shot-asset="${a.id}" title="移除引用">@${escapeHtml(a.name||'未命名资产')} ×</button>`).join('')||'<span class="shot-asset-empty">未显式引用</span>'}</div><div class="shot-asset-add"><select data-shot-asset-select><option value="">＋ 引用资产</option>${remaining.map(a=>`<option value="${a.id}">@${escapeHtml(a.name||'未命名资产')} · ${a.assetType==='character'?'角色':a.assetType==='scene'?'场景':'道具'}</option>`).join('')}</select><button type="button" data-add-shot-asset>添加</button></div></div>`;
  }
'''
s=s.replace(anchor,helper+anchor,1)

# Add explicit asset-ref column and cells.
old='<th>场景</th><th>角色</th><th>道具</th><th>景别</th>'
new='<th>场景</th><th>角色</th><th>道具</th><th>资产引用</th><th>景别</th>'
if old not in s: raise SystemExit('shot table header anchor missing')
s=s.replace(old,new,1)
old='<td><input data-shot="props" value="${escapeAttr(s.props||\'\')}"></td><td><select data-shot="shotSize">'
new='<td><input data-shot="props" value="${escapeAttr(s.props||\'\')}"></td><td>${shotAssetRefsCellHtml(d,s)}</td><td><select data-shot="shotSize">'
if old not in s: raise SystemExit('shot row asset column anchor missing')
s=s.replace(old,new,1)

# Add explicit asset-ref handlers in shots tab, before addShot binding.
anchor="      $('#addShot').onclick=()=>{"
if anchor not in s: raise SystemExit('addShot binding anchor missing')
bind=r'''      $$('[data-shot-row]',featureModal).forEach(row=>{const shot=d.shots.find(x=>x.id===row.dataset.shotRow);if(!shot)return;$('[data-add-shot-asset]',row)?.addEventListener('click',()=>{const id=$('[data-shot-asset-select]',row)?.value;if(!id)return showToast('请选择要引用的资产');shot.assetRefs=[...new Set([...(shot.assetRefs||[]),id])];markScriptShotDirty(shot,'资产引用已修改');scriptWorkflowInvalidate(d,'shots');saveState();rerender()});$$('[data-remove-shot-asset]',row).forEach(btn=>btn.addEventListener('click',()=>{shot.assetRefs=(shot.assetRefs||[]).filter(id=>id!==btn.dataset.removeShotAsset);markScriptShotDirty(shot,'资产引用已修改');scriptWorkflowInvalidate(d,'shots');saveState();rerender()}))});
'''
s=s.replace(anchor,bind+anchor,1)

app.write_text(s,encoding='utf-8')

t=ROOT/'tests'/'script-shot-asset-refs.test.mjs'
t.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('shot editor exposes explicit stable asset references',()=>{
  assert.match(app,/function shotAssetRefsCellHtml\(d,shot\)/);
  assert.match(app,/@\$\{escapeHtml\(a\.name\|\|'未命名资产'\)\}/);
  assert.match(app,/data-shot-asset-select/);
  assert.match(app,/data-add-shot-asset/);
  assert.match(app,/data-remove-shot-asset/);
});
test('shot asset refs mutate assetIds rather than names',()=>{
  assert.match(app,/shot\.assetRefs=\[\.\.\.new Set\(\[\.\.\.\(shot\.assetRefs\|\|\[\]\),id\]\)\]/);
  assert.match(app,/shot\.assetRefs=\(shot\.assetRefs\|\|\[\]\)\.filter\(id=>id!==btn\.dataset\.removeShotAsset\)/);
  assert.match(app,/markScriptShotDirty\(shot,'资产引用已修改'\)/);
});
''',encoding='utf-8')
print('patched explicit Shot asset refs')
