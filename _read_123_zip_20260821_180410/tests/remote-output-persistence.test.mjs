import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');

test('remote output persistence authenticates only provider-origin downloads',()=>{
  assert.match(server,/function isProviderOutputOrigin\(provider,value\)/);
  assert.match(server,/sameProviderOrigin\?providerHeaders\(provider\):\{\}/);
  assert.match(server,/sameProviderOrigin\?\{allowCredentiallessCrossOriginRedirect:true\}:\{sameOrigin:false\}/);
});

test('provider credentials are stripped before a same-origin result redirect reaches a CDN',()=>{
  assert.match(server,/allowCredentiallessCrossOriginRedirect:true/);
  assert.match(server,/sanitizeHeaderObject\(requestOptions\.headers\|\|\{\}\)/);
});

test('remote video persistence uses the same 250MB floor as explicit video content downloads',()=>{
  assert.match(server,/modality==='video'\?Math\.max\(MAX_UPLOAD_BYTES,250\*1024\*1024\):MAX_UPLOAD_BYTES/);
  assert.match(server,/materializeRemoteOutput\(output,provider,task\.nodeType\)/);
  assert.match(server,/value:mediaUrl\(file\),persisted:true/);
});
