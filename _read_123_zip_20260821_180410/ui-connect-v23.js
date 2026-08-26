(() => {
  const app = document.getElementById('app');
  const viewport = document.getElementById('canvasViewport');
  const bottomDock = document.getElementById('bottomDock');
  const edgeLayer = document.getElementById('edgeLayer');
  const connectBtn = bottomDock?.querySelector('[data-dock-action="connect"]');

  if (!app || !viewport || !bottomDock || !connectBtn) return;

  let active = false;
  let edgeCount = edgeLayer?.querySelectorAll('path.edge:not(.temp-edge)').length || 0;

  const ensureHint = () => {
    let hint = document.getElementById('uiConnectHint');
    if (hint) return hint;
    hint = document.createElement('div');
    hint.id = 'uiConnectHint';
    hint.className = 'ui-connect-hint';
    hint.setAttribute('role', 'status');
    app.appendChild(hint);
    return hint;
  };

  const setHint = (text) => {
    const hint = ensureHint();
    hint.textContent = text;
    hint.classList.toggle('hidden', !active);
  };

  const setConnectMode = (next) => {
    active = Boolean(next);
    app.classList.toggle('ui-connect-active', active);
    viewport.classList.toggle('ui-connect-mode', active);
    connectBtn.classList.toggle('active', active);
    connectBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    connectBtn.setAttribute('title', active ? '连接模式 · 拖动右侧 + 到目标节点' : '连接节点');
    setHint(active ? '拖动节点右侧 + 到目标节点左侧 +' : '');
    if (active) edgeCount = edgeLayer?.querySelectorAll('path.edge:not(.temp-edge)').length || 0;
  };

  connectBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    setConnectMode(!active);
  }, true);

  bottomDock.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-dock-action]');
    if (!button || button === connectBtn || !active) return;
    setConnectMode(false);
  }, true);

  viewport.addEventListener('pointerdown', (event) => {
    if (!active) return;
    const out = event.target.closest?.('.node-port.out');
    if (out) setHint('拖到目标节点左侧 + 完成连接');
  }, true);

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const typing = target instanceof HTMLElement && (target.matches('input,textarea,select,[contenteditable="true"]') || target.isContentEditable);
    if (typing) return;
    if (event.key === 'Escape' && active) {
      event.preventDefault();
      setConnectMode(false);
      return;
    }
    if (event.key.toLowerCase() === 'c' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      setConnectMode(!active);
    }
  });

  if (edgeLayer) {
    const observer = new MutationObserver(() => {
      const nextCount = edgeLayer.querySelectorAll('path.edge:not(.temp-edge)').length;
      if (active && nextCount > edgeCount) setConnectMode(false);
      edgeCount = nextCount;
    });
    observer.observe(edgeLayer, { childList: true, subtree: true });
  }

  setConnectMode(false);
})();
