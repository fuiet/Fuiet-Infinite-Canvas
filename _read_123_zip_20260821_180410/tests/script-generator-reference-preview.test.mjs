import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Preview=require('../script-generator-reference-preview-v1.js');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

function fixture(){
  return{
    nodes:[
      {id:'char-node',type:'image',outputUrl:'https://cdn.example.com/char.png'},
      {id:'style-node',type:'image',title:'风格板',outputUrl:'https://cdn.example.com/style-node.png'},
      {id:'script-1',type:'script',scriptData:{
        globalStyle:{text:'电影胶片质感',referenceMediaUrls:['https://cdn.example.com/style-upload.png'],referenceNodeIds:['style-node']},
        assets:{
          characters:[{id:'char-1',name:'小林',mediaUrl:'https://cdn.example.com/char.png',nodeIds:['char-node']}],
          scenes:[],
          props:[{id:'prop-1',name:'红色钥匙',mediaUrl:'https://cdn.example.com/key.png',nodeIds:[]}]
        },
        shots:[{id:'shot-1',characters:'小林',scene:'',props:'红色钥匙',action:'小林拿起红色钥匙',dialogue:'',assetRefs:['char-1','prop-1']}]
      }},
      {id:'prod-1',type:'image',prompt:'final',toolParams:{scriptNodeId:'script-1',shotId:'shot-1'}}
    ],
    edges:[{id:'e1',source:'char-node',target:'prod-1',type:'asset',role:'character_reference'}]
  };
}

test('preview shows implicit upload/style refs but not an already connected asset',()=>{
  const refs=Preview.virtualReferences(fixture(),'prod-1');
  assert.equal(refs.length,3);
  assert.deepEqual(refs.map(ref=>ref.url).sort(),[
    'https://cdn.example.com/key.png',
    'https://cdn.example.com/style-node.png',
    'https://cdn.example.com/style-upload.png'
  ]);
  assert.equal(refs.some(ref=>ref.url==='https://cdn.example.com/char.png'),false);
  assert.equal(refs.filter(ref=>ref.role==='style_reference').length,2);
});

test('preview recovers named legacy asset when assetRefs is empty',()=>{
  const state=fixture();
  state.nodes.find(node=>node.id==='script-1').scriptData.shots[0].assetRefs=[];
  state.edges=[];
  const refs=Preview.virtualReferences(state,'prod-1');
  assert.ok(refs.some(ref=>ref.assetId==='char-1'));
  assert.ok(refs.some(ref=>ref.assetId==='prop-1'));
});

test('preview ignores ordinary generators without script production identity',()=>{
  const state=fixture();
  state.nodes.push({id:'plain-image',type:'image',prompt:'hello',toolParams:{}});
  assert.deepEqual(Preview.virtualReferences(state,'plain-image'),[]);
});

test('preview html labels references as automatically supplied at execution time',()=>{
  const html=Preview.stripHtml([{id:'x',type:'image',role:'style_reference',url:'https://cdn.example.com/style.png',title:'风格板',text:'胶片'}]);
  assert.match(html,/脚本参考 1/);
  assert.match(html,/执行时自动带入/);
  assert.match(html,/data-script-reference-role="style_reference"/);
});

test('browser loads provenance before task normalization and reference preview after it',()=>{
  const provenance=bootstrap.indexOf('./script-prompt-provenance-v1.js');
  const upstream=bootstrap.indexOf('./upstream-generation-inputs-v1.js');
  const preview=bootstrap.indexOf('./script-generator-reference-preview-v1.js');
  assert.ok(provenance>=0&&upstream>provenance&&preview>upstream);
  assert.match(bootstrap,/script-prompt-provenance-v1\.css\?v=\$\{batchInputV\}/);
  assert.match(bootstrap,/script-generator-reference-preview-v1\.css\?v=\$\{batchInputV\}/);
  assert.match(bootstrap,/20260907-universal-upstream-inputs-1/);
});
