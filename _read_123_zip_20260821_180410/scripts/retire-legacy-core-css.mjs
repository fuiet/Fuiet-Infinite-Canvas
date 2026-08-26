import { readFileSync, writeFileSync } from 'node:fs';

const cssPath = new URL('../styles.css', import.meta.url);
const testPath = new URL('../tests/ui-design-system.test.mjs', import.meta.url);
let css = readFileSync(cssPath, 'utf8');
let tests = readFileSync(testPath, 'utf8');

const coreStart = '.node{position:absolute;width:320px;min-height:180px;background:#1b1d21;';
const coreEnd = '.gen-progress > i{display:block;height:100%;width:0%;background:#65eecf;transition:width .2s}\n';
const start = css.indexOf(coreStart);
const endStart = css.indexOf(coreEnd, start);
if (start < 0 || endStart < 0) throw new Error('legacy core node/composer block not found');
const end = endStart + coreEnd.length;
css = css.slice(0, start) + '/* UI 2.3 owns node, context-toolbar and composer visuals. */\n' + css.slice(end);

const mobile = '@media (max-width:900px){.bottom-center-hint{display:none}.drawer{width:240px}.generator-panel{width:360px}.topbar-right .top-icon:nth-child(-n+2){display:none}}\n';
if (!css.includes(mobile)) throw new Error('legacy mobile rule not found');
css = css.replace(mobile, '');

const exactLinePrefixes = [
  '.node{background:#252628;',
  '.node:hover{border-color:#5b6068}',
  '.node.selected{border-color:#8ae9d3;',
  '.node-header{height:26px;',
  '.node-header:active{cursor:grabbing}',
  '.node-footer{display:none!important}',
  '.node-toolbar{max-width:calc(100vw - 80px);',
  '.node-toolbar::-webkit-scrollbar{display:none}',
  '.generator-panel{transition:opacity .12s ease,transform .12s ease}',
  '.generator-panel{overscroll-behavior:contain;scrollbar-width:thin}'
];
let removed = 0;
css = css.split('\n').filter((line) => {
  if (exactLinePrefixes.some((prefix) => line.startsWith(prefix))) {
    removed++;
    return false;
  }
  return true;
}).join('\n');
if (removed < 8) throw new Error(`expected at least 8 duplicate legacy lines removed, got ${removed}`);

const forbidden = [
  coreStart,
  '.node-toolbar{position:absolute;z-index:90;',
  '.generator-panel{position:absolute;z-index:89;width:420px;',
  '.node{background:#252628;',
  '.node-footer{display:none!important}',
  '@media (max-width:900px){.bottom-center-hint'
];
for (const item of forbidden) {
  if (css.includes(item)) throw new Error(`legacy core CSS remains: ${item}`);
}

const testName = "legacy scaffold no longer owns core node, toolbar or composer visuals";
if (!tests.includes(testName)) {
  tests += `\n\ntest('${testName}', () => {\n  const legacy = read('styles.css');\n  assert.doesNotMatch(legacy, /\\.node\\{position:absolute;width:320px;min-height:180px;background:#1b1d21/);\n  assert.doesNotMatch(legacy, /\\.node-toolbar\\{position:absolute;z-index:90/);\n  assert.doesNotMatch(legacy, /\\.generator-panel\\{position:absolute;z-index:89;width:420px/);\n  assert.doesNotMatch(legacy, /\\.node\\{background:#252628/);\n  assert.doesNotMatch(legacy, /\\.node-footer\\{display:none!important/);\n  assert.doesNotMatch(legacy, /@media \\(max-width:900px\\)\\{\\.bottom-center-hint/);\n  assert.match(read('styles/nodes.css'), /Universal Four-State Node Model/);\n  assert.match(read('styles/composer.css'), /\\.generator-panel\\{position:absolute/);\n  assert.match(read('styles/context-toolbar.css'), /\\.node-toolbar\\{position:absolute/);\n});\n`;
}

writeFileSync(cssPath, css, 'utf8');
writeFileSync(testPath, tests, 'utf8');
console.log(`Retired legacy core UI CSS (${removed} duplicate lines removed)`);
