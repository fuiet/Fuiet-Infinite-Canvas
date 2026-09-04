import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const picker=fs.readFileSync(new URL('../script-asset-picker-modal-v1.js',import.meta.url),'utf8');
const reference=fs.readFileSync(new URL('../script-assets-reference-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-asset-picker-modal-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('prepare-assets empty preview and editor hero open the dedicated image picker modal',()=>{
  assert.match(picker,/\.script-asset-card \.asset-preview/);
  assert.match(picker,/\.script-asset-hero-trigger/);
  assert.match(picker,/activeAssetCard\(\)/);
  assert.match(picker,/cardHasMedia\(card\)/);
  assert.match(picker,/stopImmediatePropagation\(\)/);
  assert.match(picker,/script-asset-picker-modal/);
});

test('asset picker capture listener loads before the legacy reference adapter',()=>{
  const pickerPos=bootstrap.indexOf('./script-asset-picker-modal-v1.js');
  const referencePos=bootstrap.indexOf('./script-assets-reference-v1.js');
  assert.ok(pickerPos>=0);
  assert.ok(referencePos>=0);
  assert.ok(pickerPos<referencePos);
  assert.match(reference,/\.script-asset-hero-trigger,\.script-asset-hero-more/);
});

test('picker exposes the four requested image sources',()=>{
  for(const label of ['AI生成','从当前画布选择','本地上传','个人资产库'])assert.ok(picker.includes(label));
  assert.ok(picker.includes("picker.tab='canvas'"));
  assert.ok(picker.includes('当前画布暂无节点'));
});

test('AI tab has system prompt, user editing, model, quality, resolution and ratio controls',()=>{
  assert.match(picker,/系统生成提示词/);
  assert.match(picker,/重新生成提示词/);
  assert.match(picker,/scriptAssetPickerPrompt/);
  assert.match(picker,/scriptAssetPickerModel/);
  assert.match(picker,/scriptAssetPickerQuality/);
  assert.match(picker,/scriptAssetPickerResolution/);
  assert.match(picker,/scriptAssetPickerRatio/);
  assert.match(picker,/确认生成/);
  assert.match(picker,/promptEdited=true/);
  assert.match(picker,/CanvasModelImageCapabilities\?\.resolve/);
});

test('AI generation settings are applied to the one script asset node before generation',()=>{
  assert.match(picker,/function applyOneShotNodeSettings/);
  assert.match(picker,/item\.aspectRatio=settings\.aspectRatio/);
  assert.match(picker,/item\.resolution=settings\.resolution/);
  assert.match(picker,/item\.imageQuality=settings\.imageQuality/);
  assert.match(picker,/item\.prompt=picker\.promptDraft/);
  assert.match(picker,/drawerAssetGenerate/);
});

test('picker reuses existing upload and canvas asset handlers',()=>{
  assert.match(picker,/drawerAssetUpload/);
  assert.match(picker,/drawerAssetCanvas/);
  assert.match(picker,/drawerAssetBindCanvas/);
});

test('picker AI layout is styled as prompt plus bottom generation toolbar',()=>{
  assert.match(css,/\.script-asset-picker-ai\{[^}]*grid-template-rows:auto minmax\(0,1fr\) auto/);
  assert.match(css,/\.script-asset-picker-ai-footer/);
  assert.match(css,/\.script-asset-picker-ai-settings/);
  assert.match(css,/\.script-asset-picker-ai-generate/);
});

test('picker runtime is loaded and cache-busted from index through browser bootstrap',()=>{
  assert.match(bootstrap,/script-asset-picker-modal-v1\.js/);
  assert.match(bootstrap,/script-asset-picker-modal-v1\.css/);
  assert.match(bootstrap,/20260904-script-asset-picker-modal-5/);
  assert.match(index,/browser-bootstrap\.js\?v=20260904-script-asset-picker-modal-5/);
});
