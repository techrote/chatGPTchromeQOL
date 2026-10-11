(() => {
  'use strict';
  const ID = 'cgpt-response-completion-watch';
  let wasStreaming = false;
  let finishTimer = 0;
  let lastNotice = 0;

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  }

  function streaming() {
    const selectors = [
      'button[data-testid="stop-button"]',
      'button[aria-label*="Stop generating" i]',
      'button[aria-label*="Stop response" i]',
      '[data-testid*="stop"][role="button"]'
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (visible(el)) return true;
    }
    return false;
  }

  function notifyComplete() {
    if (Date.now() - lastNotice < 4000) return;
    lastNotice = Date.now();
    if (document.hidden || !document.hasFocus()) {
      chrome.runtime.sendMessage({
        type: 'cgpt-response-complete',
        title: document.title || 'ChatGPT',
        url: location.href
      });
    }
  }

  function check() {
    const now = streaming();
    render(now);
    if (now) {
      wasStreaming = true;
      clearTimeout(finishTimer);
      return;
    }
    if (wasStreaming) {
      wasStreaming = false;
      clearTimeout(finishTimer);
      finishTimer = setTimeout(() => {
        if (!streaming()) notifyComplete();
      }, 900);
    }
  }

  function render(active = streaming()) {
    let b = document.getElementById(ID);
    if (!b) {
      b = document.createElement('div');
      b.id = ID;
      b.style.cssText = 'position:fixed;right:14px;bottom:484px;z-index:2147483589;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;pointer-events:none';
      document.documentElement.appendChild(b);
    }
    b.textContent = active ? 'Response watch: generating' : 'Response watch: idle';
    b.style.opacity = active ? '1' : '.5';
  }

  new MutationObserver(check).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['aria-label','data-testid','disabled']});
  setInterval(check, 1200);
  check();
})();
