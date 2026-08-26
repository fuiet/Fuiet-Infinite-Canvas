import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles/image-node.css', import.meta.url), 'utf8');

assert.match(index, /styles\/image-node\.css/, 'image-node.css must be loaded');
assert.match(app, /applyLocalImageToNode\(n,file\)/, 'empty image nodes must accept direct local upload');
assert.match(app, /image-file-drop-target/, 'empty image nodes must accept drag/drop directly');
assert.match(app, /w:t==='image'\?620:320/, 'blank-canvas image uploads should use the mature image width');
assert.match(app, /style_reference','风格'/, 'image composer should expose the style reference slot');
assert.match(app, /character_reference','标记'/, 'image composer should expose the subject marker slot');
assert.match(app, /image_reference','聚焦'/, 'image composer should expose the image/focus reference slot');
assert.match(app, /width=isImage\|\|isVideo\?820/, 'image composer must remain on the fixed media composer geometry');
assert.match(app, /height=isImage\?246:isVideo\?258/, 'image composer must keep its fixed 246px height');
assert.match(app, /人像后期调节/, 'image result toolbar must expose portrait post-processing');
assert.match(app, /label:'全景'/, 'image result toolbar must expose panorama');
assert.match(app, /label:'多角度'/, 'image result toolbar must expose multi-angle');
assert.match(app, /label:'打光'/, 'image result toolbar must expose relighting');
assert.match(app, /label:'九宫格'/, 'image result toolbar must expose nine-grid');
assert.match(app, /label:'高清'/, 'image result toolbar must expose HD');
assert.match(app, /label:'元素编辑'/, 'image result toolbar must expose element editing');
assert.match(app, /label:'图层分离'/, 'image result toolbar must expose layer separation');
assert.match(app, /label:'宫格切分'/, 'image result toolbar must expose grid splitting');
assert.match(app, /id:'upload'.*上传图片 \/ 视频 \/ 音频/s, 'blank-canvas upload action must remain available');
assert.match(app, /viewport\.addEventListener\('drop'/, 'external file drop on canvas must remain available');
assert.match(css, /\.generator-panel\.image-generator[\s\S]*width:820px!important/, 'image composer CSS should lock width');
assert.match(css, /height:246px!important/, 'image composer CSS should lock height');
assert.match(css, /node-toolbar\.node-toolbar-image/, 'image result toolbar must have a dedicated compact surface');

console.log('image node LibTV parity checks passed');