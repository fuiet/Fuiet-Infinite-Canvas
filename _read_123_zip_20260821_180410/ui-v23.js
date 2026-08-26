(() => {
  const assetManagerBtn = document.getElementById('assetManagerBtn');
  const drawer = document.getElementById('drawer');
  const viewport = document.getElementById('canvasViewport');
  const legacyAssetAction = document.querySelector('#bottomDock [data-dock-action="asset"]');

  if (!assetManagerBtn || !drawer || !legacyAssetAction) return;

  const setOpen = (open) => {
    assetManagerBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    assetManagerBtn.classList.toggle('active', open);
    if (!open) {
      drawer.classList.add('hidden');
      drawer.removeAttribute('data-ui-v23-panel');
    }
  };

  assetManagerBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = !drawer.classList.contains('hidden') && drawer.dataset.uiV23Panel === 'asset';
    if (open) {
      setOpen(false);
      return;
    }
    legacyAssetAction.click();
    drawer.dataset.uiV23Panel = 'asset';
    setOpen(true);
  });

  drawer.addEventListener('click', (event) => event.stopPropagation());
  viewport?.addEventListener('pointerdown', () => {
    if (drawer.dataset.uiV23Panel === 'asset') setOpen(false);
  });

  const observer = new MutationObserver(() => {
    if (drawer.classList.contains('hidden')) {
      assetManagerBtn.setAttribute('aria-expanded', 'false');
      assetManagerBtn.classList.remove('active');
      drawer.removeAttribute('data-ui-v23-panel');
    }
  });
  observer.observe(drawer, { attributes: true, attributeFilter: ['class'] });
})();
