(() => {
  'use strict';
  const ID = 'cgpt-model-cost-guard';
  const SHORT_CHARS = 800;
  let bypassUntil = 0;

  const editor = () => document.querySelector('#prompt-textarea,[data-testid="prompt-textarea"],textarea,[contenteditable="true"][role="textbox"]');
  const txt = el => String(el?.innerText || el?.textContent || el?.value || '').replace(/\s+/g, ' ').trim();

  function root() {
    const e = editor();
    if (!e) return null;
    return e.closest('form') || e.parentElement?.parentElement?.parentElement || e.parentElement;
  }

  function controls() {
    const r = root();
    if (!r) return '';
    return [...r.querySelectorAll('button,[role="button"],[aria-haspopup]')]
      .map(el => [txt(el), el.getAttribute('aria-label'), el.getAttribute('title')].filter(Boolean).join(' '))
      .filter(Boolean).join(' | ');
  }

  function state() {
    const p = txt(editor());
    const c = controls();
    const heavy = /\bpro\b|extra\s*high/i.test(c);
    const simple = p.length > 0 && (p.length < SHORT_CHARS || p.split(/\s+/).length < 60);
    return { p, c, heavy, simple, warn: heavy && simple };
  }

  function sendLike(ev) {
    const e = editor();
    if (!e || !txt(e)) return false;
    if (ev.type === 'keydown') return ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey && !ev.isComposing && (ev.target === e || e.contains(ev.target));
    const b = ev.target?.closest?.('button,[role="button"]');
    return !!(b && root()?.contains(b));
  }

  function guard(ev) {
    if (performance.now() < bypassUntil || !sendLike(ev)) return;
    const s = state();
    render(s);
    if (!s.warn) return;
    const ok = confirm(
      'Model Cost Guard\n\nVisible controls: ' + (s.c || 'unknown') +
      '\nPrompt length: ' + s.p.length + ' chars\n\nThis looks like a short prompt using Pro or Extra High. Send anyway?'
    );
    if (ok) {
      bypassUntil = performance.now() + 1000;
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
  }

  function render(s = state()) {
    let b = document.getElementById(ID);
    if (!b) {
      b = document.createElement('div');
      b.id = ID;
      b.style.cssText = 'position:fixed;right:14px;bottom:228px;z-index:2147483597;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;pointer-events:none';
      document.documentElement.appendChild(b);
    }
    b.textContent = s.heavy ? 'Cost guard: heavy setting' : 'Cost guard: normal';
    b.style.opacity = s.heavy ? '1' : '.55';
  }

  for (const t of ['pointerdown','mousedown','click']) addEventListener(t, guard, true);
  addEventListener('keydown', guard, true);
  setInterval(render, 800);
})();
