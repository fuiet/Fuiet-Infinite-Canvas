import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../ui-v23.js', import.meta.url);
let source = readFileSync(path, 'utf8');

const replaceOnce = (label, from, to) => {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, got ${count}`);
  source = source.replace(from, to);
};

replaceOnce(
  'ready guard',
  `  const normalizeAddNodeMenu = () => {\n    if (!contextMenu || !contextMenu.classList.contains('libtv-add-menu')) return;\n    const mainTitle = [...contextMenu.querySelectorAll('.libtv-add-title')].find((el) => !el.classList.contains('resource'));`,
  `  const normalizeAddNodeMenu = () => {\n    if (!contextMenu || !contextMenu.classList.contains('libtv-add-menu')) return;\n    if (contextMenu.classList.contains('ui-v23-add-menu') && contextMenu.dataset.uiV23AddMenuReady === 'true') return;\n    const mainTitle = [...contextMenu.querySelectorAll('.libtv-add-title')].find((el) => !el.classList.contains('resource'));`
);

replaceOnce(
  'non-blank cleanup',
  `    if (!mainTitle || mainTitle.textContent.trim() !== '添加节点') {\n      contextMenu.classList.remove('ui-v23-add-menu');\n      return;\n    }`,
  `    if (!mainTitle || mainTitle.textContent.trim() !== '添加节点') {\n      contextMenu.classList.remove('ui-v23-add-menu');\n      delete contextMenu.dataset.uiV23AddMenuReady;\n      return;\n    }`
);

replaceOnce(
  'ready marker',
  `      contextMenu.setAttribute('role', 'menu');\n      contextMenu.replaceChildren(mainTitle, ...orderedMain, resourceTitle, ...orderedResources);`,
  `      contextMenu.setAttribute('role', 'menu');\n      contextMenu.replaceChildren(mainTitle, ...orderedMain, resourceTitle, ...orderedResources);\n      contextMenu.dataset.uiV23AddMenuReady = 'true';`
);

replaceOnce(
  'dock add fallback',
  `  if (contextMenu) {\n    const addMenuObserver = new MutationObserver(() => normalizeAddNodeMenu());\n    addMenuObserver.observe(contextMenu, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });\n    normalizeAddNodeMenu();\n  }\n\n  if (!drawer || !viewport || !nodeLayer) return;`,
  `  if (contextMenu) {\n    const addMenuObserver = new MutationObserver(() => normalizeAddNodeMenu());\n    addMenuObserver.observe(contextMenu, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });\n    normalizeAddNodeMenu();\n  }\n\n  const dockAddButton = document.querySelector('#bottomDock [data-dock-action="add"]');\n  dockAddButton?.addEventListener('click', () => {\n    queueMicrotask(() => {\n      const alreadyOpen = contextMenu?.classList.contains('libtv-add-menu') && !contextMenu.classList.contains('hidden');\n      if (alreadyOpen || !viewport) return;\n      const buttonRect = dockAddButton.getBoundingClientRect();\n      const viewportRect = viewport.getBoundingClientRect();\n      const x = buttonRect.left + buttonRect.width / 2;\n      const y = Math.max(viewportRect.top + 80, buttonRect.top - 10);\n      viewport.dispatchEvent(new MouseEvent('dblclick', { bubbles:true, cancelable:true, clientX:x, clientY:y, button:0 }));\n    });\n  });\n\n  if (!drawer || !viewport || !nodeLayer) return;`
);

if (!source.includes("ADD_NODE_ORDER = ['text','image','video','smart-edit','director','frame-analysis','audio','script','asset-library']")) throw new Error('add-node order missing');
if (!source.includes("ADD_RESOURCE_ORDER = ['upload','history']")) throw new Error('resource order missing');
if (!source.includes("rows.get('asset')?.remove()")) throw new Error('duplicate asset cleanup missing');

writeFileSync(path, source, 'utf8');
console.log('UI 2.3 add-node menu finalized');
