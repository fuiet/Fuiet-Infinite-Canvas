/* Provider/model auto-ready UI v1
 * The runtime adapter contract now supplies zero-config defaults. This file keeps
 * the provider modal and standalone model page aligned with that behavior.
 */
(()=>{
'use strict';

const replacements=new Map([
  ['待完成适配','已自动适配'],
  ['需要高级配置','已就绪'],
  ['到「全部模型」完成高级配置','已自动配置，可直接使用'],
  ['到 [全部模型] 完成高级配置','已自动配置，可直接使用'],
  ['到【全部模型】完成高级配置','已自动配置，可直接使用'],
  ['完成高级配置','已自动配置，可直接使用']
]);

function replaceText(root){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    let text=node.nodeValue||'';
    let next=text;
    for(const [from,to] of replacements){
      if(next.includes(from))next=next.split(from).join(to);
    }
    if(next!==text)node.nodeValue=next;
  }
}

function decorateModels(root=document){
  root.querySelectorAll?.('.adapter-status.pending').forEach(el=>{
    el.classList.remove('pending');
    el.classList.add('ready');
    if(!String(el.textContent||'').trim()||String(el.textContent||'').includes('自动适配'))el.textContent='自动适配';
  });
  root.querySelectorAll?.('.adapter-summary small').forEach(el=>{
    if(String(el.textContent||'').includes('高级配置'))el.textContent='已就绪';
  });
}

function apply(root=document){
  replaceText(root);
  decorateModels(root);
}

const targets=[document.querySelector('#providerModal'),document.querySelector('#modelList')].filter(Boolean);
for(const target of targets){
  apply(target);
  new MutationObserver(()=>apply(target)).observe(target,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>apply(document));
else apply(document);
})();
