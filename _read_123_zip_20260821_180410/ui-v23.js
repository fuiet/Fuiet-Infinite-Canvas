(() => {
  const assetManagerBtn = document.getElementById('assetManagerBtn');
  const drawer = document.getElementById('drawer');
  const viewport = document.getElementById('canvasViewport');
  const nodeLayer = document.getElementById('nodeLayer');
  const contextMenu = document.getElementById('contextMenu');
  const legacyAssetAction = document.querySelector('#bottomDock [data-dock-action="asset"]');

  const ensureAddNodeMenuCss = () => {
    if (document.querySelector('link[data-ui-v23-add-node-menu]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './styles/add-node-menu.css';
    link.dataset.uiV23AddNodeMenu = 'true';
    document.head.appendChild(link);
  };
  ensureAddNodeMenuCss();

  const ADD_NODE_ORDER = ['text','image','video','smart-edit','director','frame-analysis','audio','script','asset-library'];
  const ADD_RESOURCE_ORDER = ['upload','history'];
  const ADD_NODE_LABELS = {
    text:'文本', image:'图片', video:'视频', 'smart-edit':'视频编辑', director:'导演台',
    'frame-analysis':'逐帧拉片', audio:'音频', script:'脚本', 'asset-library':'素材库',
    upload:'上传', history:'从生成历史选择'
  };
  const ADD_NODE_ICONS = {
    text:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h10M5 17h7"/></svg>',
    image:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="15" height="14" rx="2"/><path d="m6.5 16 3.6-3.7 2.6 2.3 2.1-2.2 2.7 3"/><circle cx="15.7" cy="8.6" r="1.2"/><path d="M19 3v4M17 5h4"/></svg>',
    video:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="15" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/><path d="M19 3v4M17 5h4"/></svg>',
    'smart-edit':'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="7" r="2.2"/><circle cx="6.5" cy="17" r="2.2"/><path d="m8.4 8.2 9.1 7.3M8.4 15.8l9.1-7.3"/></svg>',
    director:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4 7 4-7 4-7-4 7-4Z"/><path d="m5 12 7 4 7-4M5 16l7 4 7-4"/></svg>',
    'frame-analysis':'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="12" r="5.5"/><circle cx="11" cy="12" r="2"/><path d="M11 4V2M11 22v-2M3 12H1M21 12h-2M16.5 6.5 18 5M16.5 17.5 18 19"/></svg>',
    audio:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h2M7 8v8M10 5v14M13 9v6M16 6v12M19 10v4M22 12h-1"/></svg>',
    script:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11l3 3v13H5V4Z"/><path d="M15 4v4h4M8 10h5M8 14h8M8 18h5"/><path d="M3 8h4M3 16h4"/></svg>',
    'asset-library':'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><circle cx="12" cy="16" r="3"/><path d="M10.3 9.7 11.2 13M13.7 9.7 12.8 13"/></svg>',
    upload:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V5M8.5 8.5 12 5l3.5 3.5"/><path d="M5 14v5h14v-5"/></svg>',
    history:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="2.3"/><circle cx="15.5" cy="15.5" r="2.3"/><path d="M10.7 10.7 13.8 13.8M6.8 15.5H4.5V8.5H7"/></svg>'
  };

  const normalizeAddNodeMenu = () => {
    if (!contextMenu || !contextMenu.classList.contains('libtv-add-menu')) return;
    if (contextMenu.classList.contains('ui-v23-add-menu') && contextMenu.dataset.uiV23AddMenuReady === 'true') return;
    const mainTitle = [...contextMenu.querySelectorAll('.libtv-add-title')].find((el) => !el.classList.contains('resource'));
    if (!mainTitle || mainTitle.textContent.trim() !== '添加节点') {
      contextMenu.classList.remove('ui-v23-add-menu');
      delete contextMenu.dataset.uiV23AddMenuReady;
      return;
    }
    if (contextMenu.dataset.uiV23AddMenuBusy === 'true') return;
    contextMenu.dataset.uiV23AddMenuBusy = 'true';
    try {
      contextMenu.classList.add('ui-v23-add-menu');
      mainTitle.textContent = '添加节点';
      let resourceTitle = contextMenu.querySelector('.libtv-add-title.resource');
      if (!resourceTitle) {
        resourceTitle = document.createElement('div');
        resourceTitle.className = 'libtv-add-title resource';
        resourceTitle.textContent = '添加资源';
      } else {
        resourceTitle.textContent = '添加资源';
      }

      const rows = new Map([...contextMenu.querySelectorAll('.libtv-add-row[data-id]')].map((row) => [row.dataset.id, row]));
      rows.get('asset')?.remove();

      const prepareRow = (id) => {
        const row = rows.get(id);
        if (!row) return null;
        row.setAttribute('role', 'menuitem');
        row.setAttribute('aria-label', ADD_NODE_LABELS[id] || id);
        const icon = row.querySelector(':scope > i');
        if (icon && icon.dataset.uiV23Icon !== id) {
          icon.innerHTML = ADD_NODE_ICONS[id] || '';
          icon.dataset.uiV23Icon = id;
        }
        const label = row.querySelector(':scope > span');
        if (label) label.textContent = ADD_NODE_LABELS[id] || label.textContent;
        if (id === 'smart-edit') {
          const badge = row.querySelector('.libtv-badge');
          if (badge) badge.textContent = 'Beta';
        }
        if (id === 'director') {
          const badge = row.querySelector('.libtv-badge');
          if (badge) badge.textContent = 'NEW';
        }
        if (id === 'frame-analysis') {
          const badge = row.querySelector('.libtv-badge');
          if (badge) badge.textContent = 'SD 2.5';
        }
        if (id === 'script' || id === 'asset-library') {
          let chevron = row.querySelector(':scope > b.add-node-chevron') || row.querySelector(':scope > b:not(.libtv-badge)');
          if (!chevron) {
            chevron = document.createElement('b');
            row.appendChild(chevron);
          }
          chevron.className = 'add-node-chevron';
          chevron.textContent = '›';
          chevron.setAttribute('aria-hidden', 'true');
        }
        return row;
      };

      const orderedMain = ADD_NODE_ORDER.map(prepareRow).filter(Boolean);
      const orderedResources = ADD_RESOURCE_ORDER.map(prepareRow).filter(Boolean);
      const allowed = new Set([...ADD_NODE_ORDER, ...ADD_RESOURCE_ORDER]);
      [...contextMenu.querySelectorAll('.libtv-add-row[data-id]')].forEach((row) => {
        if (!allowed.has(row.dataset.id)) row.remove();
      });

      contextMenu.setAttribute('role', 'menu');
      contextMenu.replaceChildren(mainTitle, ...orderedMain, resourceTitle, ...orderedResources);
      contextMenu.dataset.uiV23AddMenuReady = 'true';
    } finally {
      delete contextMenu.dataset.uiV23AddMenuBusy;
    }
  };

  if (contextMenu) {
    const addMenuObserver = new MutationObserver(() => normalizeAddNodeMenu());
    addMenuObserver.observe(contextMenu, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    normalizeAddNodeMenu();
  }

  const dockAddButton = document.querySelector('#bottomDock [data-dock-action="add"]');
  dockAddButton?.addEventListener('click', () => {
    queueMicrotask(() => {
      const alreadyOpen = contextMenu?.classList.contains('libtv-add-menu') && !contextMenu.classList.contains('hidden');
      if (alreadyOpen || !viewport) return;
      const buttonRect = dockAddButton.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      const x = buttonRect.left + buttonRect.width / 2;
      const y = Math.max(viewportRect.top + 80, buttonRect.top - 10);
      viewport.dispatchEvent(new MouseEvent('dblclick', { bubbles:true, cancelable:true, clientX:x, clientY:y, button:0 }));
    });
  });

  if (!drawer || !viewport || !nodeLayer) return;

  const NODE_TYPES = ['text', 'image', 'video', 'audio', 'script', 'director'];
  const TYPE_LABELS = { text:'文本', image:'图片', video:'视频', audio:'音频', script:'脚本', director:'导演台' };
  const TYPE_ICONS = { text:'▤', image:'▣', video:'▶', audio:'♫', script:'☰', director:'◇' };
  const nodeType = (node) => node.getAttribute('data-node-type') || NODE_TYPES.find((type) => node.classList.contains(`node-${type}`)) || 'node';

  const setOpen = (open) => {
    if (assetManagerBtn) {
      assetManagerBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      assetManagerBtn.classList.toggle('active', open);
    }
    if (!open) {
      drawer.classList.add('hidden');
      drawer.removeAttribute('data-ui-v23-panel');
    }
  };

  const visibleCanvasNodes = () => [...nodeLayer.querySelectorAll('.node')].map((node) => {
    const type = nodeType(node);
    const title = node.querySelector('.node-title-stack b')?.textContent?.trim() || TYPE_LABELS[type] || '节点';
    const state = node.getAttribute('data-content-state') || 'empty';
    const image = node.querySelector('img')?.getAttribute('src') || '';
    return { node, id: node.dataset.id || '', type, title, state, image };
  });

  const selectVisibleCanvasNode = (id) => {
    const selector = `.node[data-id="${CSS.escape(String(id))}"]`;
    const node = nodeLayer.querySelector(selector);
    if (!node) return false;
    const menuButton = node.querySelector('.node-menu-btn');
    if (menuButton) {
      menuButton.click();
      requestAnimationFrame(() => contextMenu?.classList.add('hidden'));
    }
    node.classList.add('ui-v23-focus-pulse');
    window.setTimeout(() => node.classList.remove('ui-v23-focus-pulse'), 700);
    return true;
  };

  const buildCanvasPanel = () => {
    const panel = document.createElement('section');
    panel.className = 'asset-manager-panel asset-manager-canvas-panel';
    panel.dataset.assetManagerPanel = 'canvas';
    const rows = visibleCanvasNodes();
    panel.innerHTML = `
      <div class="asset-manager-filter">
        <span>画布元素</span>
        <label><input type="search" data-canvas-node-search placeholder="搜索节点" aria-label="搜索画布节点"></label>
      </div>
      <div class="asset-manager-node-list">
        ${rows.map((item) => `
          <button type="button" class="asset-manager-node-row" data-canvas-node-id="${item.id}">
            <span class="asset-manager-node-thumb ${item.image ? 'has-image' : ''}" ${item.image ? `style="background-image:url('${item.image.replace(/'/g, '%27')}')"` : ''}>${item.image ? '' : TYPE_ICONS[item.type] || '◇'}</span>
            <span class="asset-manager-node-copy"><b>${item.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</b><small>${TYPE_LABELS[item.type] || item.type} · ${item.state === 'result' ? '已有结果' : '待创作'}</small></span>
          </button>`).join('') || '<div class="asset-manager-empty">当前视野没有节点</div>'}
      </div>
      <div class="asset-manager-count">当前视野 ${rows.length} 个节点</div>`;

    panel.querySelectorAll('[data-canvas-node-id]').forEach((row) => {
      row.addEventListener('click', () => {
        if (selectVisibleCanvasNode(row.dataset.canvasNodeId)) setOpen(false);
      });
    });
    const search = panel.querySelector('[data-canvas-node-search]');
    search?.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      panel.querySelectorAll('[data-canvas-node-id]').forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.hidden = Boolean(q && !text.includes(q));
      });
    });
    return panel;
  };

  const decorateAssetDrawer = () => {
    if (drawer.dataset.uiV23Decorated === 'true') return;
    const existing = [...drawer.childNodes];
    const shell = document.createElement('div');
    shell.className = 'asset-manager-shell';

    const workspace = document.getElementById('workspaceName')?.textContent?.trim() || '未命名工作区';
    const canvas = document.getElementById('projectName')?.textContent?.trim() || '画布';
    const head = document.createElement('div');
    head.className = 'asset-manager-head';
    head.innerHTML = `<div><b>${workspace}</b><span>${canvas}</span></div><button type="button" data-asset-manager-close aria-label="关闭资产管理">×</button>`;

    const tabs = document.createElement('div');
    tabs.className = 'asset-manager-tabs';
    tabs.innerHTML = '<button type="button" class="active" data-asset-tab="canvas">画布</button><button type="button" data-asset-tab="assets">资产</button>';

    const body = document.createElement('div');
    body.className = 'asset-manager-body';
    const canvasPanel = buildCanvasPanel();
    const assetPanel = document.createElement('section');
    assetPanel.className = 'asset-manager-panel asset-manager-assets-panel hidden';
    assetPanel.dataset.assetManagerPanel = 'assets';
    existing.forEach((node) => assetPanel.appendChild(node));
    body.append(canvasPanel, assetPanel);
    shell.append(head, tabs, body);
    drawer.replaceChildren(shell);
    drawer.dataset.uiV23Decorated = 'true';

    const activate = (name) => {
      tabs.querySelectorAll('[data-asset-tab]').forEach((button) => button.classList.toggle('active', button.dataset.assetTab === name));
      canvasPanel.classList.toggle('hidden', name !== 'canvas');
      assetPanel.classList.toggle('hidden', name !== 'assets');
    };
    tabs.querySelectorAll('[data-asset-tab]').forEach((button) => button.addEventListener('click', () => activate(button.dataset.assetTab)));
    head.querySelector('[data-asset-manager-close]')?.addEventListener('click', () => setOpen(false));
    activate('canvas');
  };

  const openAssetManager = () => {
    if (!legacyAssetAction) return;
    const alreadyOpen = !drawer.classList.contains('hidden') && drawer.dataset.uiV23Panel === 'asset';
    if (alreadyOpen) {
      setOpen(false);
      return;
    }
    drawer.removeAttribute('data-ui-v23-decorated');
    legacyAssetAction.click();
    drawer.dataset.uiV23Panel = 'asset';
    requestAnimationFrame(() => {
      decorateAssetDrawer();
      setOpen(true);
    });
  };

  assetManagerBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    openAssetManager();
  });

  drawer.addEventListener('click', (event) => event.stopPropagation());
  viewport.addEventListener('pointerdown', () => {
    if (drawer.dataset.uiV23Panel === 'asset') setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.dataset.uiV23Panel === 'asset') setOpen(false);
  });

  const drawerObserver = new MutationObserver(() => {
    if (drawer.classList.contains('hidden')) {
      assetManagerBtn?.setAttribute('aria-expanded', 'false');
      assetManagerBtn?.classList.remove('active');
      drawer.removeAttribute('data-ui-v23-panel');
    }
  });
  drawerObserver.observe(drawer, { attributes: true, attributeFilter: ['class'] });

  const simplifyWorkflowHud = () => {
    const hud = document.getElementById('workflowRunHud');
    if (!hud) return;
    hud.classList.add('ui-v23-workflow-hud');
  };
  const appObserver = new MutationObserver(() => {
    simplifyWorkflowHud();
  });
  appObserver.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  simplifyWorkflowHud();
})();