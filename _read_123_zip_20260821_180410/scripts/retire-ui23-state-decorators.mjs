import { readFileSync, writeFileSync } from 'node:fs';

const patchFile = (url, transform) => {
  const source = readFileSync(url, 'utf8');
  const next = transform(source);
  if (next === source) throw new Error(`No change produced for ${url.pathname}`);
  writeFileSync(url, next, 'utf8');
};

patchFile(new URL('../ui-v23.js', import.meta.url), (source) => {
  const needle = `  const syncNodeState = (node) => {\n    const type = nodeType(node);`;
  if (!source.includes(needle)) throw new Error('ui-v23 syncNodeState anchor not found');
  if (source.includes("node.dataset.uiV23Native === 'true'")) throw new Error('ui-v23 native bypass already installed');
  return source.replace(needle, `  const syncNodeState = (node) => {
    if (node.dataset.uiV23Native === 'true') {
      const id = node.dataset.id || '';
      const task = node.getAttribute('data-task-state') || 'idle';
      const previous = previousTaskState.get(id) || 'idle';
      if (id && ['running', 'queued'].includes(previous) && ['completed', 'idle', 'failed', 'cancelled'].includes(task)) {
        composerOverride.delete(id);
      }
      if (id) previousTaskState.set(id, task);
      return;
    }
    const type = nodeType(node);`);
});

patchFile(new URL('../ui-result-v23.js', import.meta.url), (source) => {
  const needle = `  const syncNode = (node) => {\n    const type = nodeType(node);\n    const mediaResult = MEDIA_TYPES.has(type) && mediaHasResult(node, type);`;
  if (!source.includes(needle)) throw new Error('ui-result syncNode anchor not found');
  if (source.includes("const native = node.dataset.uiV23Native === 'true'")) throw new Error('ui-result native bypass already installed');
  return source.replace(needle, `  const syncNode = (node) => {
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
    const mediaResult = MEDIA_TYPES.has(type) && mediaHasResult(node, type);`);
});

console.log('UI 2.3 native nodes now bypass legacy state/result decoration');
