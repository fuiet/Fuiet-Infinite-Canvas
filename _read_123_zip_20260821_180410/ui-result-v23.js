(() => {
  const nodeLayer = document.getElementById('nodeLayer');
  if (!nodeLayer) return;

  const MEDIA_TYPES = new Set(['image', 'video', 'audio']);
  let syncFrame = 0;

  const nodeType = (node) => node.getAttribute('data-node-type') || ['text', 'image', 'video', 'audio', 'script', 'director'].find((type) => node.classList.contains(`node-${type}`)) || 'node';

  const mediaHasResult = (node, type) => {
    if (type === 'image') return Boolean(node.querySelector('.image-node-shell.has-output, .media-clip img, .node-content-img, img'));
    if (type === 'video') return Boolean(node.querySelector('video, .node-content-video, .video-node-shell.has-output'));
    if (type === 'audio') return Boolean(node.querySelector('audio.node-media-audio, audio, .audio-node-shell.has-output'));
    return false;
  };

  const formatDuration = (seconds) => {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value <= 0) return '';
    const total = Math.round(value);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const headerMetaHost = (node) => node.querySelector('.node-header-right') || node.querySelector('.node-header');

  const setResultMeta = (node, text) => {
    const host = headerMetaHost(node);
    if (!host) return;
    let meta = host.querySelector('[data-ui-v23-result-meta]');
    if (!text) {
      meta?.remove();
      return;
    }
    if (!meta) {
      meta = document.createElement('span');
      meta.className = 'ui-v23-result-meta';
      meta.dataset.uiV23ResultMeta = '';
      const menu = host.querySelector('.node-menu-btn');
      if (menu) host.insertBefore(meta, menu);
      else host.append(meta);
    }
    if (meta.textContent !== text) meta.textContent = text;
  };

  const probeBackgroundImage = (node, element) => {
    if (!element || element.dataset.uiV23MetaProbe === 'true') return;
    const background = getComputedStyle(element).backgroundImage || '';
    const match = background.match(/^url\(["']?(.*?)["']?\)$/);
    if (!match?.[1]) return;
    element.dataset.uiV23MetaProbe = 'true';
    const image = new Image();
    image.onload = () => setResultMeta(node, image.naturalWidth && image.naturalHeight ? `${image.naturalWidth} × ${image.naturalHeight}` : '');
    image.src = match[1];
  };

  const syncMediaMeta = (node, type) => {
    if (type === 'image') {
      const image = node.querySelector('img');
      if (image) {
        const apply = () => setResultMeta(node, image.naturalWidth && image.naturalHeight ? `${image.naturalWidth} × ${image.naturalHeight}` : '');
        if (image.complete) apply();
        else if (image.dataset.uiV23MetaBound !== 'true') {
          image.dataset.uiV23MetaBound = 'true';
          image.addEventListener('load', apply, { once: true });
        }
        return;
      }
      probeBackgroundImage(node, node.querySelector('.node-content-img, .image-node-stage, .media-clip'));
      return;
    }

    if (type === 'video') {
      const video = node.querySelector('video');
      if (!video) return;
      const apply = () => {
        const resolution = video.videoWidth && video.videoHeight ? `${video.videoWidth} × ${video.videoHeight}` : '';
        const duration = formatDuration(video.duration);
        setResultMeta(node, [resolution, duration].filter(Boolean).join(' · '));
      };
      if (video.readyState >= 1) apply();
      else if (video.dataset.uiV23MetaBound !== 'true') {
        video.dataset.uiV23MetaBound = 'true';
        video.addEventListener('loadedmetadata', apply, { once: true });
      }
      return;
    }

    if (type === 'audio') {
      const audio = node.querySelector('audio');
      if (!audio) return;
      const apply = () => setResultMeta(node, formatDuration(audio.duration));
      if (audio.readyState >= 1) apply();
      else if (audio.dataset.uiV23MetaBound !== 'true') {
        audio.dataset.uiV23MetaBound = 'true';
        audio.addEventListener('loadedmetadata', apply, { once: true });
      }
    }
  };

  const actualProgress = (node) => {
    const status = node.querySelector('.node-run-status')?.textContent || '';
    const match = status.match(/(\d{1,3})\s*%/);
    if (!match) return null;
    return Math.max(0, Math.min(100, Number(match[1])));
  };

  const syncProgress = (node) => {
    const state = node.getAttribute('data-task-state') || 'idle';
    let progress = node.querySelector('[data-ui-v23-result-progress]');
    if (!['running', 'queued'].includes(state)) {
      progress?.remove();
      return;
    }

    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'ui-v23-result-progress';
      progress.dataset.uiV23ResultProgress = '';
      progress.setAttribute('role', 'status');
      progress.setAttribute('aria-live', 'polite');
      progress.innerHTML = '<div class="ui-v23-result-progress-copy"><span></span><strong></strong></div><div class="ui-v23-result-progress-track"><i></i></div>';
      node.append(progress);
    }

    const percent = actualProgress(node);
    const label = state === 'queued' ? '排队中' : '处理中';
    progress.querySelector('span').textContent = label;
    progress.querySelector('strong').textContent = percent == null ? '' : `${percent}%`;
    progress.classList.toggle('indeterminate', percent == null);
    progress.classList.toggle('queued', state === 'queued');
    const bar = progress.querySelector('i');
    if (percent != null) bar.style.width = `${percent}%`;
    else bar.style.removeProperty('width');
    progress.setAttribute('aria-label', percent == null ? label : `${label} ${percent}%`);
  };

  const syncFailure = (node) => {
    const failed = node.getAttribute('data-task-state') === 'failed';
    const actions = node.querySelector('.node-failed-actions');
    if (!failed || !actions) return;
    actions.classList.add('ui-v23-failure');
    const message = actions.querySelector('span');
    if (message) message.textContent = '生成失败';
    const buttons = [...actions.querySelectorAll('button')];
    if (buttons[0]) buttons[0].textContent = '重新生成';
    buttons.slice(1).forEach((button) => {
      button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
    });
  };

  const syncVersions = (node) => {
    const nav = node.querySelector('.node-result-nav');
    if (!nav) return;
    nav.classList.add('ui-v23-version-nav');
    nav.setAttribute('aria-label', '生成版本');
    const marker = nav.querySelector('span')?.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
    const index = marker ? Number(marker[1]) : 1;
    const count = marker ? Number(marker[2]) : 1;
    nav.dataset.versionIndex = String(index);
    nav.dataset.versionCount = String(count);
    nav.classList.toggle('single-version', count <= 1);
    nav.querySelector('.compare')?.setAttribute('title', '对比版本');
  };

  const syncResizeHandle = (node) => {
    const handle = node.querySelector('.node-resize-handle');
    if (!handle) return;
    handle.classList.add('ui-v23-resize-handle');
    handle.setAttribute('title', '调整大小');
    handle.setAttribute('aria-label', '调整节点大小');
  };

  const syncNode = (node) => {
    const type = nodeType(node);
    const native = node.dataset.uiV23Native === 'true';
    if (native) {
      const result = node.getAttribute('data-content-state') === 'result';
      if (!result) {
        setResultMeta(node, '');
        return;
      }
      if (MEDIA_TYPES.has(type)) syncMediaMeta(node, type);
      return;
    }
    const mediaResult = MEDIA_TYPES.has(type) && mediaHasResult(node, type);
    if (mediaResult && node.getAttribute('data-content-state') !== 'result') node.setAttribute('data-content-state', 'result');
    const result = node.getAttribute('data-content-state') === 'result' || mediaResult;

    node.classList.toggle('ui-v23-result-shell', result);
    node.classList.toggle('ui-v23-media-result', result && MEDIA_TYPES.has(type));
    node.classList.toggle(`ui-v23-media-${type}`, result && MEDIA_TYPES.has(type));

    if (!result) {
      node.querySelector('[data-ui-v23-result-progress]')?.remove();
      setResultMeta(node, '');
      return;
    }

    if (MEDIA_TYPES.has(type)) syncMediaMeta(node, type);
    syncProgress(node);
    syncFailure(node);
    syncVersions(node);
    syncResizeHandle(node);
  };

  const syncAll = () => {
    cancelAnimationFrame(syncFrame);
    syncFrame = requestAnimationFrame(() => nodeLayer.querySelectorAll('.node').forEach(syncNode));
  };

  const observer = new MutationObserver(syncAll);
  observer.observe(nodeLayer, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-content-state', 'data-task-state']
  });

  document.addEventListener('loadedmetadata', syncAll, true);
  document.addEventListener('load', syncAll, true);
  syncAll();
})();
