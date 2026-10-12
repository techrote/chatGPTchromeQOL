ChatQOL.register({
  id: 'response-watch', name: 'Response Completion Watch', group: 'Usage & monitoring',
  description: 'Desktop notification on an observed transition from streaming to idle when tab is unfocused.',
  stage: 'migrated prototype',
  mount(ctx) {
    let wasStreaming = false;
    let pendingFinish = null;
    let lastNotification = 0;
    function check() {
      const current = ctx.dom.streaming();
      if (current) {
        wasStreaming = true;
        clearTimeout(pendingFinish);
        return;
      }
      if (!wasStreaming) return;
      wasStreaming = false;
      clearTimeout(pendingFinish);
      pendingFinish = setTimeout(() => {
        if (!ctx.active || ctx.dom.streaming() || (Date.now() - lastNotification < 4000)) return;
        if (document.hidden || !document.hasFocus()) {
          lastNotification = Date.now();
          chrome.runtime.sendMessage({ type: 'chatqol-response-done', title: document.title });
        }
      }, 900);
    }
    ctx.cleanup(() => clearTimeout(pendingFinish));
    ctx.every(check, 1200);
    ctx.listen(document, 'visibilitychange', check);
    ctx.on('settings-changed', check);
    check();
  }
});
