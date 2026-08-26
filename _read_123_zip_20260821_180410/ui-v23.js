(() => {
  const assetManagerBtn = document.getElementById('assetManagerBtn');
  const drawer = document.getElementById('drawer');
  const viewport = document.getElementById('canvasViewport');
  const nodeLayer = document.getElementById('nodeLayer');
  const contextMenu = document.getElementById('contextMenu');
  const toolbar = document.getElementById('nodeToolbar');
  const generator = document.getElementById('generatorPanel');
  const legacyAssetAction = document.querySelector('#bottomDock [data-dock-action="asset"]');

  if (!drawer || !viewport || !nodeLayer) return;

  const NODE_TYPES = ['text', 'image', 'video', 'audio', 'script', 'director'];
  const TYPE_LABELS = {
    text: '文本',
    image: '图片',
    video: '视频',
    audio: '音频',
    script: '脚本',
    director: '导演台'
  };
  const TYPE_ICONS = {
    text: '▤',
    image: '▣',
    video: '▶',
    audio: '♫',
    script: '☰',
    director: '◇'
  };

  const composerOverride = new Set();
  const resultSizeCache = new Map();
  const previousTaskState = new Map();

  const nodeType = (node) => NODE_TYPES.find((type) => node.classList.contains(`node-${type}`)) || 'node';

  const nodeHasResult = (node, type = nodeType(node)) => {
    if (node.querySelector('.node-result-nav')) return true;
    if (type === 'image') {
      return Boolean(node.querySelector('.image-node-shell.has-output, .media-clip img, .node-content-img'));
    }
    if (type === 'video') return Boolean(node.querySelector('video'));
    if (type === 'audio') return Boolean(node.querySelector('audio.node-media-audio, audio'));
    if (type === 'text') return Boolean(node.querySelector('.text-node-shell.has-text'));
    if (type === 'script') return Boolean(node.querySelector('.script-node-compact small'));
    if (type === 'director') return Boolean(node.querySelector('.director-node-preview'));
    return false;
  };

  const taskState = (node) => {
    if (node.classList.contains('task-running') || node.classList.contains('wf-running')) return 'running';
    if (node.classList.contains('task-pending') || node.classList.contains('wf-pending')) return 'queued';
    if (node.classList.contains('task-failed') || node.classList.contains('wf-failed')) return 'failed';
    if (node.classList.contains('task-canceled') || node.classList.contains('wf-canceled')) return 'cancelled';
    if (node.classList.contains('task-succeeded') || node.classList.contains('wf-succeeded')) return 'completed';
    return 'idle';
  };

  const setAttrIfChanged = (el, name, value) => {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  };

  const rememberResultSize = (node, content, interaction) => {
    if (content !== 'result' || !node.dataset.id) return;
    const id = node.dataset.id;
    if (interaction === 'idle') {
      resultSizeCache.set(id, {
        width: node.style.width || '',
        height: node.style.height || ''
      });
      return;
    }
    if (interaction !== 'selected') return;
    const cached = resultSizeCache.get(id);
    if (cached) {
      if (cached.width) node.style.width = cached.width;
      else node.style.removeProperty('width');
      if (cached.height) node.style.height = cached.height;
      else node.style.removeProperty('height');
      return;
    }
    if (node.classList.contains('node-image') && !node.classList.contains('resized-node')) {
      node.style.width = '320px';
      node.style.removeProperty('height');
    }
  };

  const syncNodeState = (node) => {
    const type = nodeType(node);
    const content = nodeHasResult(node, type) ? 'result' : 'empty';
    const interaction = node.classList.contains('selected') || node.classList.contains('multi-selected') ? 'selected' : 'idle';
    const task = taskState(node);
    const id = node.dataset.id || '';
    const previous = previousTaskState.get(id) || 'idle';

    if (id && ['running', 'queued'].includes(previous) && ['completed', 'idle', 'failed', 'cancelled'].includes(task)) {
      composerOverride.delete(id);
    }
    if (id) previousTaskState.set(id, task);

    setAttrIfChanged(node, 'data-node-type', type);
    setAttrIfChanged(node, 'data-content-state', content);
    setAttrIfChanged(node, 'data-interaction-state', interaction);
    setAttrIfChanged(node, 'data-task-state', task);
    rememberResultSize(node, content, interaction);
  };

  const selectedNodes = () => [...nodeLayer.querySelectorAll('.node')].filter((node) => {
    return node.classList.contains('selected') || node.classList.contains('multi-selected');
  });

  const positionContextToolbar = (node) => {
    if (!toolbar || toolbar.classList.contains('hidden')) return;
    requestAnimationFrame(() => {
      const r = node.getBoundingClientRect();
      const width = Math.max(180, toolbar.offsetWidth || 420);
      const left = Math.max(16, Math.min(window.innerWidth - width - 16, r.left));
      const above = r.top - (toolbar.offsetHeight || 38) - 8;
      const top = above >= 52 ? above : Math.min(window.innerHeight - (toolbar.offsetHeight || 38) - 16, r.bottom + 8);
      toolbar.style.left = `${left}px`;
      toolbar.style.top = `${Math.max(12, top)}px`;
    });
  };

  const positionComposer = (node) => {
    if (!generator) return;
    requestAnimationFrame(() => {
      const r = node.getBoundingClientRect();
      const width = Math.min(620, window.innerWidth - 64);
      const edge = 16;
      const gap = 12;
      generator.style.width = `${width}px`;
      generator.style.left = `${Math.max(edge, Math.min(window.innerWidth - width - edge, r.left - 8))}px`;
      const below = r.bottom + gap;
      const maxHeight = Math.max(180, window.innerHeight - below - 72);
      if (maxHeight >= 220) {
        generator.style.top = `${below}px`;
        generator.style.maxHeight = `${maxHeight}px`;
      } else {
        const estimated = Math.min(360, Math.max(220, generator.scrollHeight || 280));
        generator.style.top = `${Math.max(52, r.top - estimated - gap)}px`;
        generator.style.maxHeight = `${Math.max(180, r.top - 68)}px`;
      }
    });
  };

  const generatorBelongsTo = (id) => generator?.dataset.uiV23NodeId === String(id);

  const openResultComposer = (node) => {
    if (!generator || !node?.dataset.id || !generatorBelongsTo(node.dataset.id)) return;
    composerOverride.clear();
    composerOverride.add(node.dataset.id);
    setAttrIfChanged(node, 'data-ui-composer-open', 'true');
    toolbar?.classList.add('hidden');
    generator.classList.remove('hidden');
    generator.classList.add('ui-v23-result-composer');
    positionComposer(node);
    requestAnimationFrame(() => {
      generator.querySelector('#promptInput, #scriptDetailPrompt, textarea')?.focus();
    });
  };

  const decorateContextToolbar = (node) => {
    if (!toolbar || !node?.dataset.id || !generatorBelongsTo(node.dataset.id)) return;
    if (toolbar.querySelector('[data-ui-v23-edit-prompt]')) return;

    const separator = document.createElement('span');
    separator.className = 'ui-v23-context-separator';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'tool-btn ui-v23-context-action';
    edit.dataset.uiV23EditPrompt = '';
    edit.textContent = '改提示词';
    edit.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openResultComposer(node);
    });

    const rerun = document.createElement('button');
    rerun.type = 'button';
    rerun.className = 'tool-btn ui-v23-context-action';
    rerun.dataset.uiV23Rerun = '';
    rerun.textContent = '重新生成';
    rerun.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openResultComposer(node);
    });

    toolbar.append(separator, edit, rerun);
  };

  const syncInteractionSurfaces = () => {
    const selected = selectedNodes();
    if (selected.length !== 1) {
      composerOverride.clear();
      return;
    }

    const node = selected[0];
    const id = node.dataset.id || '';
    const content = node.getAttribute('data-content-state') || (nodeHasResult(node) ? 'result' : 'empty');

    [...composerOverride].forEach((candidate) => {
      if (candidate !== id) composerOverride.delete(candidate);
    });

    if (generator && !generator.classList.contains('hidden') && generator.querySelector('.lib-gen-main, .generator-shell, textarea')) {
      generator.dataset.uiV23NodeId = id;
    }

    if (content === 'empty') {
      node.removeAttribute('data-ui-composer-open');
      toolbar?.classList.add('hidden');
      return;
    }

    if (content !== 'result') return;

    if (composerOverride.has(id) && generatorBelongsTo(id)) {
      setAttrIfChanged(node, 'data-ui-composer-open', 'true');
      toolbar?.classList.add('hidden');
      generator?.classList.remove('hidden');
      generator?.classList.add('ui-v23-result-composer');
      positionComposer(node);
      return;
    }

    node.removeAttribute('data-ui-composer-open');
    generator?.classList.add('hidden');
    generator?.classList.remove('ui-v23-result-composer');
    if (toolbar?.children.length) {
      toolbar.classList.remove('hidden');
      decorateContextToolbar(node);
      positionContextToolbar(node);
    }
  };

  let nodeSyncFrame = 0;
  const syncAllNodeStates = () => {
    cancelAnimationFrame(nodeSyncFrame);
    nodeSyncFrame = requestAnimationFrame(() => {
      nodeLayer.querySelectorAll('.node').forEach(syncNodeState);
      syncInteractionSurfaces();
    });
  };

  const nodeObserver = new MutationObserver(syncAllNodeStates);
  nodeObserver.observe(nodeLayer, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  syncAllNodeStates();

  document.addEventListener('click', (event) => {
    const generate = event.target.closest?.('#generateBtn, #scriptGenerateBtn, .generate-btn');
    if (!generate) return;
    const selected = selectedNodes();
    if (selected.length !== 1) return;
    const id = selected[0].dataset.id || '';
    composerOverride.delete(id);
    selected[0].removeAttribute('data-ui-composer-open');
    requestAnimationFrame(syncAllNodeStates);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const selected = selectedNodes();
    if (selected.length === 1 && composerOverride.has(selected[0].dataset.id || '')) {
      composerOverride.delete(selected[0].dataset.id || '');
      selected[0].removeAttribute('data-ui-composer-open');
      generator?.classList.add('hidden');
      requestAnimationFrame(syncAllNodeStates);
    }
  });

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
    const state = node.getAttribute('data-content-state') || (nodeHasResult(node, type) ? 'result' : 'empty');
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
    syncAllNodeStates();
  });
  appObserver.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  simplifyWorkflowHud();
})();
