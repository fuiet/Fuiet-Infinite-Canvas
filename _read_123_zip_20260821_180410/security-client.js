(() => {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    try {
      const rawUrl = typeof input === 'string' ? input : input?.url;
      const url = new URL(rawUrl, window.location.href);
      if (url.origin === window.location.origin && url.pathname === '/api/tasks/poll' && String(init.method || 'GET').toUpperCase() === 'POST' && typeof init.body === 'string') {
        const body = JSON.parse(init.body || '{}');
        const taskId = String(body.taskId || body.task?.id || '').trim();
        if (taskId) init = { ...init, body: JSON.stringify({ taskId }) };
      }
    } catch {
      // Leave unrelated requests untouched. The server still enforces the strict poll schema.
    }
    return originalFetch(input, init);
  };
})();
