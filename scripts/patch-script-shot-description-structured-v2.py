from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / '_read_123_zip_20260821_180410' / 'app.js'
BOOT = ROOT / '_read_123_zip_20260821_180410' / 'browser-bootstrap.js'
CSS = ROOT / '_read_123_zip_20260821_180410' / 'styles' / 'script-shot-description-structured-v2.css'
TEST = ROOT / '_read_123_zip_20260821_180410' / 'tests' / 'script-shot-description-structured-v2.test.mjs'

app = APP.read_text(encoding='utf-8')
old = r'''  function scriptShotDescriptionHtml(d,shot){
    let html=escapeHtml(scriptShotVisualDescription(d,shot));
    for(const a of scriptAssetCatalog(d).filter(a=>a.name).sort((a,b)=>String(b.name).length-String(a.name).length)){
      const token=escapeHtml('@'+a.name);html=html.split(token).join(`<span class="shot-mention-token">${token}</span>`);
    }
    return html||'<span class="shot-description-empty">点击填写画面描述</span>';
  }
'''
new = r'''  function scriptShotDescriptionParts(d,shot){
    const catalog=scriptAssetCatalog(d),ids=new Set([...(shot.assetRefs||[]),...matchShotAssets(shot,d)]),refs=catalog.filter(a=>ids.has(a.id));
    let description=String(scriptShotVisualDescription(d,shot)||'');
    for(const a of catalog.filter(a=>a.name).sort((a,b)=>String(b.name).length-String(a.name).length))description=description.split('@'+a.name).join(String(a.name));
    description=description.replace(/\s+/g,' ').replace(/\s*([，。！？；：、,.!?;:])\s*/g,'$1').replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g,'$1$2').replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g,'$1$2').trim();
    const split=value=>String(value||'').split(/[、,，/|]/).map(x=>x.trim()).filter(Boolean),uniq=values=>[...new Set(values.filter(Boolean))];
    const typeOf=a=>{const type=String(a.assetType||a.type||'').toLowerCase();return type.includes('char')?'character':type.includes('scene')?'scene':'prop'};
    return{
      description,
      characters:uniq([...refs.filter(a=>typeOf(a)==='character').map(a=>a.name),...split(shot.characters)]),
      scenes:uniq([...refs.filter(a=>typeOf(a)==='scene').map(a=>a.name),...split(shot.scene)]),
      props:uniq([...refs.filter(a=>typeOf(a)==='prop').map(a=>a.name),...split(shot.props)])
    };
  }
  function scriptShotDescriptionHtml(d,shot){
    const view=scriptShotDescriptionParts(d,shot),chip=(kind,name)=>`<span class="shot-desc-ref-chip ${kind}">${escapeHtml(name)}</span>`,group=(label,kind,values)=>values.length?`<span class="shot-desc-ref-row"><span class="shot-desc-ref-label">${label}</span><span class="shot-desc-ref-chips">${values.map(name=>chip(kind,name)).join('')}</span></span>`:'';
    const refs=[group('人物','character',view.characters),group('场景','scene',view.scenes),group('道具','prop',view.props)].filter(Boolean).join('');
    return `<span class="shot-desc-card"><span class="shot-desc-main">${view.description?escapeHtml(view.description):'<span class="shot-description-empty">点击填写画面描述</span>'}</span>${refs?`<span class="shot-desc-ref-list">${refs}</span>`:''}</span>`;
  }
'''
if old not in app:
    if 'function scriptShotDescriptionParts(d,shot)' not in app:
        raise SystemExit('scriptShotDescriptionHtml target not found')
else:
    app = app.replace(old, new, 1)
APP.write_text(app, encoding='utf-8')

CSS.write_text(r'''/* Structured shot description v2: readable prose first, asset references second. */
.script-editor-table.simplified{min-width:1640px}
.script-editor-table.simplified th:nth-child(3),
.script-editor-table.simplified td:nth-child(3){width:540px!important}
.script-editor-table.simplified tbody tr{height:118px}
.script-editor-table.simplified td{height:118px}
.script-editor-shell.simplified .script-editor-table.simplified td.shot-description-column{padding:8px 10px!important;vertical-align:middle!important;text-align:left!important}
.script-editor-shell.simplified .shot-description-cell{
  width:100%;height:auto!important;min-height:96px;max-height:none!important;
  padding:10px 12px!important;border:0!important;border-radius:8px;
  background:transparent!important;color:#e8ebed!important;
  display:block!important;-webkit-line-clamp:unset!important;-webkit-box-orient:initial!important;
  text-align:left!important;overflow:visible!important;white-space:normal;cursor:text;
}
.script-editor-shell.simplified .shot-description-cell:hover{background:#1a1d20!important}
.shot-desc-card{display:flex;flex-direction:column;gap:9px;width:100%;text-align:left}
.shot-desc-main{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;color:#eceff1;font-size:13px;line-height:1.62;font-weight:400;word-break:break-word;text-align:left}
.shot-desc-ref-list{display:flex;flex-direction:column;gap:5px;padding-top:7px;border-top:1px solid #282d31;text-align:left}
.shot-desc-ref-row{display:flex;align-items:flex-start;gap:8px;min-width:0;text-align:left}
.shot-desc-ref-label{flex:0 0 32px;padding-top:2px;color:#747d85;font-size:10px;line-height:20px;text-align:left}
.shot-desc-ref-chips{display:flex;flex-wrap:wrap;gap:5px;min-width:0;text-align:left}
.shot-desc-ref-chip{display:inline-flex;align-items:center;min-height:20px;padding:1px 7px;border:1px solid #30363b;border-radius:5px;background:#202428;color:#bfc6cc;font-size:10px;line-height:16px;white-space:nowrap}
.shot-desc-ref-chip.character{border-color:#315058;background:#1b292d;color:#8ed4df}
.shot-desc-ref-chip.scene{border-color:#3a4657;background:#1e252f;color:#9db9dc}
.shot-desc-ref-chip.prop{border-color:#4a4436;background:#29261f;color:#d0bd8e}
.script-editor-shell.simplified .shot-description-empty{color:#69727a!important;font-size:12px}
@media(max-width:1200px){.script-editor-table.simplified th:nth-child(3),.script-editor-table.simplified td:nth-child(3){width:480px!important}}
''', encoding='utf-8')

boot = BOOT.read_text(encoding='utf-8')
if "const shotDescriptionV='20260907-shot-description-structured-v2-1';" not in boot:
    anchor="const batchInputV='20260907-universal-upstream-inputs-1';\n"
    if anchor not in boot: raise SystemExit('bootstrap version anchor not found')
    boot=boot.replace(anchor,anchor+"const shotDescriptionV='20260907-shot-description-structured-v2-1';\n",1)
old_app='&shotdesc=reference-1`,'
new_app='&shotdesc=${shotDescriptionV}`,'
if old_app in boot: boot=boot.replace(old_app,new_app,1)
elif 'shotdesc=${shotDescriptionV}' not in boot: raise SystemExit('bootstrap app shotdesc cache target not found')
style_anchor="      loadStyle(`./styles/script-shot-description-reference-v1.css?v=${v}`),\n"
style_line="      loadStyle(`./styles/script-shot-description-structured-v2.css?v=${shotDescriptionV}`),\n"
if style_line not in boot:
    if style_anchor not in boot: raise SystemExit('bootstrap description style anchor not found')
    boot=boot.replace(style_anchor,style_anchor+style_line,1)
BOOT.write_text(boot, encoding='utf-8')

TEST.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-shot-description-structured-v2.css',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('shot table separates prose from character scene and prop references',()=>{
  assert.match(app,/function scriptShotDescriptionParts\(d,shot\)/);
  assert.match(app,/group\('人物','character',view\.characters\)/);
  assert.match(app,/group\('场景','scene',view\.scenes\)/);
  assert.match(app,/group\('道具','prop',view\.props\)/);
  assert.match(app,/shot-desc-main/);
  assert.match(app,/shot-desc-ref-list/);
});

test('inline @ markers are stripped from display prose without changing stored source',()=>{
  assert.match(app,/description=description\.split\('@'\+a\.name\)\.join\(String\(a\.name\)\)/);
  assert.match(app,/scriptShotVisualDescription\(d,shot\)/);
  assert.doesNotMatch(app,/html=html\.split\(token\)\.join\(`<span class="shot-mention-token"/);
});

test('structured description column is wide left-aligned and readable',()=>{
  assert.match(css,/nth-child\(3\)[\s\S]*width:540px!important/);
  assert.match(css,/\.shot-desc-card\{display:flex;flex-direction:column/);
  assert.match(css,/\.shot-desc-main\{[\s\S]*-webkit-line-clamp:3/);
  assert.match(css,/\.shot-desc-ref-list\{[\s\S]*border-top/);
  assert.match(css,/text-align:left!important/);
});

test('asset classes are visually separated instead of mixed into prose',()=>{
  assert.match(css,/\.shot-desc-ref-chip\.character/);
  assert.match(css,/\.shot-desc-ref-chip\.scene/);
  assert.match(css,/\.shot-desc-ref-chip\.prop/);
});

test('bootstrap loads structured layout after legacy description CSS and cache-busts app',()=>{
  const oldIndex=boot.indexOf('script-shot-description-reference-v1.css');
  const newIndex=boot.indexOf('script-shot-description-structured-v2.css');
  assert.ok(oldIndex>=0&&newIndex>oldIndex);
  assert.match(boot,/20260907-shot-description-structured-v2-1/);
  assert.match(boot,/shotdesc=\$\{shotDescriptionV\}/);
});
''', encoding='utf-8')

print('Structured script shot description v2 patch applied.')
