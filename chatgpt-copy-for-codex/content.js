(() => {
  'use strict';
  const ID = 'cgpt-copy-for-codex';

  function selected() {
    const s = String(getSelection?.() || '').trim();
    return s.length >= 20 ? s : '';
  }

  function latestAssistantText() {
    const nodes = [...document.querySelectorAll('[data-message-author-role="assistant"]')];
    const n = nodes.at(-1);
    if (!n) return '';
    const clone = n.cloneNode(true);
    clone.querySelectorAll('button,svg,[role="button"]').forEach(x => x.remove());
    return String(clone.innerText || clone.textContent || '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async function copy() {
    const text = selected() || latestAssistantText();
    if (!text) {
      flash('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      flash('Copied ' + text.length.toLocaleString() + ' chars');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      flash('Copied ' + text.length.toLocaleString() + ' chars');
    }
  }

  function flash(msg) {
    const b = document.getElementById(ID);
    if (!b) return;
    const old = b.textContent;
    b.textContent = msg;
    setTimeout(() => b.textContent = old, 1300);
  }

  function ensure() {
    let b = document.getElementById(ID);
    if (b) return;
    b = document.createElement('button');
    b.id = ID;
    b.textContent = 'Copy for Codex';
    b.title = 'Copies selected text when present; otherwise copies the latest assistant response.';
    b.style.cssText = 'position:fixed;right:14px;bottom:452px;z-index:2147483590;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;cursor:pointer';
    b.onclick = copy;
    document.documentElement.appendChild(b);
  }

  new MutationObserver(ensure).observe(document.documentElement, {childList:true, subtree:true});
  ensure();
})();
