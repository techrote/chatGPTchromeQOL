(() => {
  'use strict';
  const ID = 'cgpt-accidental-send-guard';
  let bypassUntil = 0;

  const editor = () => document.querySelector('#prompt-textarea,[data-testid="prompt-textarea"],textarea,[contenteditable="true"][role="textbox"]');
  const text = () => String(editor()?.innerText || editor()?.textContent || editor()?.value || '').trim();

  function root() {
    const e = editor();
    return e?.closest('form') || e?.parentElement?.parentElement?.parentElement || e?.parentElement;
  }

  function reasons(p = text()) {
    const out = [];
    const fences = (p.match(/```/g) || []).length;
    if (fences % 2 === 1) out.push('unclosed triple-backtick code fence');
    if (/[:;,]$/.test(p)) out.push('ends in punctuation that often introduces more text');
    if (/[([{]$/.test(p)) out.push('ends with an opening delimiter');
    if (/\b(and|or|because|with|for|to)$/i.test(p)) out.push('ends with a linking word');
    if (/\\$/.test(p)) out.push('ends with a backslash');
    return out;
  }

  function sendLike(ev) {
    const e = editor();
    if (!e || !text()) return false;
    if (ev.type === 'keydown') return ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey && !ev.isComposing && (ev.target === e || e.contains(ev.target));
    const b = ev.target?.closest?.('button,[role="button"]');
    return !!(b && root()?.contains(b));
  }

  function guard(ev) {
    if (performance.now() < bypassUntil || !sendLike(ev)) return;
    const rs = reasons();
    render(rs);
    if (!rs.length) return;
    if (confirm('Accidental Send Guard\n\nThis prompt may be unfinished:\n• ' + rs.join('\n• ') + '\n\nSend anyway?')) {
      bypassUntil = performance.now() + 1000;
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
  }

  function render(rs = reasons()) {
    let b = document.getElementById(ID);
    if (!b) {
      b = document.createElement('div');
      b.id = ID;
      b.style.cssText = 'position:fixed;right:14px;bottom:292px;z-index:2147483595;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;pointer-events:none';
      document.documentElement.appendChild(b);
    }
    b.textContent = rs.length ? 'Send guard: ' + rs.length + ' possible unfinished signal' + (rs.length === 1 ? '' : 's') : 'Send guard: complete-looking';
    b.style.opacity = rs.length ? '1' : '.5';
  }

  for (const t of ['pointerdown','mousedown','click']) addEventListener(t, guard, true);
  addEventListener('keydown', guard, true);
  addEventListener('input', () => render(), true);
  setInterval(render, 1200);
})();
