(async()=>{
  const candidates=[
    {
      core:'https://esm.sh/three@0.170.0',
      gltf:'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js',
      transform:'https://esm.sh/three@0.170.0/examples/jsm/controls/TransformControls.js'
    },
    {
      core:'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
      gltf:null,
      transform:null
    },
    {core:'https://unpkg.com/three@0.170.0/build/three.module.js',gltf:null,transform:null}
  ];
  for(const c of candidates){
    try{
      const T=await import(c.core);window.THREE=T;const addons={};
      if(c.gltf)try{addons.GLTFLoader=(await import(c.gltf)).GLTFLoader}catch(e){addons.gltfError=e}
      if(c.transform)try{addons.TransformControls=(await import(c.transform)).TransformControls}catch(e){addons.transformError=e}
      window.THREE_ADDONS=addons;window.dispatchEvent(new CustomEvent('canvas-three-ready',{detail:{addons:Object.keys(addons)}}));return;
    }catch(e){window.__THREE_LOAD_ERROR=e}
  }
})();
