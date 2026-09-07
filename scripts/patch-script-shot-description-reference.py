from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')
APP = ROOT / 'app.js'
BOOT = ROOT / 'browser-bootstrap.js'
CSS = ROOT / 'styles' / 'script-shot-description-reference-v1.css'
TEST = ROOT / 'tests' / 'script-shot-description-reference.test.mjs'

app = APP.read_text(encoding='utf-8')
old = """  function scriptShotVisualDescription(d,shot){
    const action=String(shot?.action||'').trim(),cat=scriptAssetCatalog(d),refs=matchShotAssets(shot,d).map(id=>cat.find(a=>a.id===id)).filter(Boolean),tokens=[];
    for(const a of refs){const tag='@'+String(a.name||'').trim();if(tag!=='@'&&!action.includes(tag)&&!tokens.includes(tag))tokens.push(tag)}
    return [tokens.join(' '),action].filter(Boolean).join(tokens.length&&action?'，':'');
  }
"""
new = """  function scriptShotVisualDescription(d,shot){
    let action=String(shot?.action||'').replace(/\\s+/g,' ').trim();
    const cat=scriptAssetCatalog(d),refs=matchShotAssets(shot,d).map(id=>cat.find(a=>a.id===id)).filter(Boolean).sort((a,b)=>String(b?.name||'').length-String(a?.name||'').length);
    if(!action)return refs.map(a=>'@'+String(a.name||'').trim()).filter(x=>x!=='@').join('、');
    for(const a of refs){
      const name=String(a?.name||'').trim();if(!name)continue;
      const tag='@'+name;if(action.includes(tag))continue;
      const index=action.indexOf(name);if(index>=0)action=action.slice(0,index)+'@'+action.slice(index);
    }
    return action;
  }
"""
if old not in app:
    raise SystemExit('scriptShotVisualDescription target not found')
app = app.replace(old, new, 1)
APP.write_text(app, encoding='utf-8')

CSS.write_text(r'''/* Reference-style script shot description: concise prose with inline @assets. */
.script-editor-table.simplified th:nth-child(3),
.script-editor-table.simplified td:nth-child(3){width:470px}
.script-editor-shell.simplified .script-editor-table.simplified th:nth-child(3){text-align:left!important;padding-left:14px!important}
.script-editor-shell.simplified .script-editor-table.simplified td.shot-description-column{padding:0!important;vertical-align:middle!important;text-align:left!important}
.script-editor-shell.simplified .shot-description-cell{
  width:100%;
  min-height:76px;
  height:auto;
  max-height:92px;
  padding:10px 14px!important;
  border:0!important;
  background:transparent!important;
  color:#e8ebed!important;
  font-size:13px!important;
  font-weight:400;
  line-height:1.62!important;
  letter-spacing:0;
  text-align:left!important;
  white-space:normal;
  word-break:break-word;
  overflow:hidden;
  cursor:text;
  display:-webkit-box!important;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:4;
  align-items:initial!important;
  justify-content:initial!important;
}
.script-editor-shell.simplified .shot-description-cell:hover{background:#191c1f!important}
.script-editor-shell.simplified .shot-description-cell .shot-mention-token{
  color:#21c7df!important;
  font-weight:500;
  white-space:nowrap;
}
.script-editor-shell.simplified .shot-description-empty{color:#69727a!important}
@media(max-width:1200px){
  .script-editor-table.simplified th:nth-child(3),
  .script-editor-table.simplified td:nth-child(3){width:420px}
}
''', encoding='utf-8')

boot = BOOT.read_text(encoding='utf-8')
old_app = "`./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=generator-reference-strip-1&scriptclick=toolbar-3&scriptgen=panel-4`,"
new_app = "`./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=generator-reference-strip-1&scriptclick=toolbar-3&scriptgen=panel-4&shotdesc=reference-1`,"
if old_app not in boot:
    raise SystemExit('bootstrap app cache target not found')
boot = boot.replace(old_app, new_app, 1)
anchor = "      loadStyle(`./styles/script-editor-simplified-v1.css?v=${v}`),\n"
insert = anchor + "      loadStyle(`./styles/script-shot-description-reference-v1.css?v=${v}`),\n"
if anchor not in boot:
    raise SystemExit('bootstrap style anchor not found')
boot = boot.replace(anchor, insert, 1)
BOOT.write_text(boot, encoding='utf-8')

TEST.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles/script-shot-description-reference-v1.css', import.meta.url), 'utf8');
const boot = fs.readFileSync(new URL('../browser-bootstrap.js', import.meta.url), 'utf8');

test('shot description no longer prepends every referenced asset before prose', () => {
  assert.doesNotMatch(app, /return \[tokens\.join\(' '\),action\]/);
  assert.match(app, /const index=action\.indexOf\(name\);if\(index>=0\)action=action\.slice\(0,index\)\+'@'\+action\.slice\(index\)/);
});

test('shot description normalizes whitespace and preserves natural sentence order', () => {
  assert.match(app, /replace\(\/\\s\+\/g,' '\)\.trim\(\)/);
  assert.match(app, /if\(!action\)return refs\.map\(a=>'@'/);
});

test('reference-style cell is wide, left aligned and uses inline cyan mentions', () => {
  assert.match(css, /nth-child\(3\).*width:470px/s);
  assert.match(css, /\.shot-description-cell\{[\s\S]*text-align:left!important/);
  assert.match(css, /\.shot-mention-token\{[\s\S]*#21c7df!important/);
  assert.match(css, /-webkit-line-clamp:4/);
});

test('bootstrap loads new description CSS and cache-busts app logic', () => {
  assert.match(boot, /script-shot-description-reference-v1\.css/);
  assert.match(boot, /shotdesc=reference-1/);
});
''', encoding='utf-8')

print('Script shot description reference-style patch applied.')
