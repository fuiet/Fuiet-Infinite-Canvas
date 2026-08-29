const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const files=['tests/node-provider-security.test.mjs','tests/provider-save-auto-discovery.test.mjs'];
const old="['server.js','store.js','video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','local-media-result.js']";
const next="['server.js','store.js','image-request-parameters.js','model-image-capabilities.js','video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','local-media-result.js']";
for(const file of files){
  const p=path.join(root,file);let s=fs.readFileSync(p,'utf8');
  if(!s.includes(old))throw new Error(`missing minimal server dependency list in ${file}`);
  s=s.replace(old,next);fs.writeFileSync(p,s);
}
console.log('Agnes server test fixtures updated');
