const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(name){return fs.readFileSync(path.join(root,name),'utf8')}
function write(name,s){fs.writeFileSync(path.join(root,name),s)}

{
  const file='app.js';
  let s=read(file);
  const old="$('.node-header',el)?.insertBefore(badge,$('.node-menu-btn',el)||null)";
  const next="(()=>{const headerRight=$('.node-header-right',el),menu=headerRight?$('.node-menu-btn',headerRight):null;if(headerRight)headerRight.insertBefore(badge,menu||null);else $('.node-header',el)?.appendChild(badge)})()";
  if(!s.includes(old))throw new Error('workflow status insertion pattern not found');
  s=s.replace(old,next);
  write(file,s);
}

{
  const file='browser-bootstrap.js';
  let s=read(file);
  const old="const v='20260829-agnes-fixed-adapter-1';";
  const next="const v='20260829-workflow-visual-fix-1';";
  if(!s.includes(old))throw new Error('bootstrap cache version not found');
  s=s.replace(old,next);
  write(file,s);
}

for(const file of ['index.html','models.html']){
  let s=read(file);
  const old='./browser-bootstrap.js?v=20260829-agnes-fixed-adapter-1';
  const next='./browser-bootstrap.js?v=20260829-workflow-visual-fix-1';
  if(!s.includes(old))throw new Error(`browser bootstrap tag not found in ${file}`);
  s=s.replace(old,next);
  write(file,s);
}

{
  const file='tests/video-result-cache-bust.test.mjs';
  let s=read(file);
  s=s.replace("const APP_VERSION='20260829-agnes-fixed-adapter-1';","const APP_VERSION='20260829-workflow-visual-fix-1';\nconst BOOTSTRAP_VERSION='20260829-workflow-visual-fix-1';");
  s=s.replace("for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js','browser-bootstrap.js'])assert.ok(index.includes(`./${file}?v=${REGISTRY_VERSION}`),file);","for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js'])assert.ok(index.includes(`./${file}?v=${REGISTRY_VERSION}`),file);\n  assert.ok(index.includes(`./browser-bootstrap.js?v=${BOOTSTRAP_VERSION}`),'browser-bootstrap.js');");
  s=s.replace("for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js','browser-bootstrap.js'])assert.ok(models.includes(`./${file}?v=${REGISTRY_VERSION}`),file);","for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js'])assert.ok(models.includes(`./${file}?v=${REGISTRY_VERSION}`),file);\n  assert.ok(models.includes(`./browser-bootstrap.js?v=${BOOTSTRAP_VERSION}`),'browser-bootstrap.js');");
  write(file,s);
}

{
  const file='tests/video-error-reporting.test.mjs';
  let s=read(file);
  const old="for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js','browser-bootstrap.js']){\n    assert.ok(index.includes(`${file}?v=20260829-agnes-fixed-adapter-1`),file);\n  }";
  const next="for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js']){\n    assert.ok(index.includes(`${file}?v=20260829-agnes-fixed-adapter-1`),file);\n  }\n  assert.ok(index.includes('browser-bootstrap.js?v=20260829-workflow-visual-fix-1'),'browser-bootstrap.js');";
  if(!s.includes(old))throw new Error('video-error-reporting cache assertion not found');
  s=s.replace(old,next);
  write(file,s);
}

{
  const file='tests/workflow-visual-status.test.mjs';
  const s=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');\nconst app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');\n\ntest('workflow status badge inserts into the header-right parent safely',()=>{\n  assert.doesNotMatch(app,/\\$\\('\.node-header',el\\)\\?\\.insertBefore\\(badge,\\$\\('\.node-menu-btn',el\\)\\|\\|null\\)/);\n  assert.match(app,/headerRight=\\$\\('\.node-header-right',el\\)/);\n  assert.match(app,/headerRight\.insertBefore\\(badge,menu\\|\\|null\\)/);\n});\n`;
  write(file,s);
}
console.log('workflow visual fix applied');
