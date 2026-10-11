(() => {
  'use strict';
  const ID = 'cgpt-long-prompt-warning';
  const WARN_CHARS = 12000;
  let bypassUntil = 0;

  const editor = () => document.querySelector('#prompt-textarea,[data-testid="prompt-textarea"],textarea,[contenteditable="true"][role="textbox"]');
  const txt = el => String(el?.innerText || el?.textContent || el?.value || '');
  const clean = () => txt(editor()).trim();

  function root() {
    const e = editor();
    return e?.closest('form') || e?.parentElement?.parentElement?.parentElement || e?.parentElement;
  }

  function sendLike(ev) {
    const e = editor();
    if (!e || !clean()) return false;
    if (ev.type === 'keydown') return ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey && !ev.isComposing && (ev.target === e || e.contains(ev.target));
    const b = ev.target?.closest?.('button,[role="button"]');
    return !!(b && root()?.contains(b));
  }

  function metrics() {
    const p = clean();
    return { chars: p.length, approxTokens: Math.ceil(p.length / 4), warn: p.length >= WARN_CHARS };
  }

  function guard(ev) {
    if (performance.now() < bypassUntil || !sendLike(ev)) return;
    const m = metrics();
    render(m);
    if (!m.warn) return;
    if (confirm('Long Prompt Warning\n\n' + m.chars.toLocaleString() + ' characters (~' + m.approxTokens.toLocaleString() + ' rough tokens).\n\nSend anyway?')) {
      bypassUntil = performance.now() + 1000;
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
  }

  function render(m = metrics()) {
    let b = document.getElementById(ID);
    if (!b) {
      b = document.createElement('div');
      b.id = ID;
      b.style.cssText = 'position:fixed;right:14px;bottom:260px;z-index:2147483596;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;pointer-events:none';
      document.documentElement.appendChild(b);
    }
    b.textContent = 'Prompt: ' + m.chars.toLocaleString() + ' chars · ~' + m.approxTokens.toLocaleString() + ' tok';
    b.style.outline = m.warn ? '1px solid #a33' : 'none';
  }

  for (const t of ['pointerdown','mousedown','click']) addEventListener(t, guard, true);
  addEventListener('keydown', guard, true);
  addEventListener('input', () => render(), true);
  setInterval(render, 1200);
})();
