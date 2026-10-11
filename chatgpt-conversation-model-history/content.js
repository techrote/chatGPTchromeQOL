(() => {
  'use strict';
  const KEY = 'cgptConversationModelHistory';
  const ID = 'cgpt-conversation-model-history';
  const seen = new WeakSet();
  let pending = null;

  const editor = () => document.querySelector('#prompt-textarea,[data-testid="prompt-textarea"],textarea,[contenteditable="true"][role="textbox"]');
  const txt = el => String(el?.innerText || el?.textContent || el?.value || '').replace(/\s+/g, ' ').trim();
  const chatKey = () => location.pathname;

  function root() {
    const e = editor();
    return e?.closest('form') || e?.parentElement?.parentElement?.parentElement || e?.parentElement;
  }

  function label() {
    const r = root();
    return r ? [...r.querySelectorAll('button,[role="button"],[aria-haspopup]')].map(txt).filter(Boolean).join(' | ') : '';
  }

  function capture() {
    if (!txt(editor())) return;
    pending = { at: Date.now(), iso: new Date().toISOString(), chat: chatKey(), controls: label(), chars: txt(editor()).length };
  }

  function attempt(ev) {
    if (ev.type === 'keydown') {
      if (ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey && !ev.isComposing && (ev.target === editor() || editor()?.contains(ev.target))) capture();
      return;
    }
    if (ev.target?.closest?.('button,[role="button"]') && root()?.contains(ev.target.closest('button,[role="button"]'))) capture();
  }

  async function confirmed(node) {
    if (!pending || !txt(node)) return;
    const p = pending;
    pending = null;
    const got = await chrome.storage.local.get(KEY);
    const db = got[KEY] && typeof got[KEY] === 'object' ? got[KEY] : {};
    const rows = Array.isArray(db[p.chat]) ? db[p.chat] : [];
    rows.push(p);
    db[p.chat] = rows.slice(-1000);
    await chrome.storage.local.set({ [KEY]: db });
    render();
  }

  function scan() {
    document.querySelectorAll('[data-message-author-role="user"]').forEach(n => {
      if (seen.has(n)) return;
      seen.add(n);
      confirmed(n);
    });
  }

  async function render() {
    let b = document.getElementById(ID);
    if (!b) {
      b = document.createElement('button');
      b.id = ID;
      b.style.cssText = 'position:fixed;right:14px;bottom:196px;z-index:2147483598;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;cursor:pointer';
      b.onclick = show;
      document.documentElement.appendChild(b);
    }
    const got = await chrome.storage.local.get(KEY);
    const rows = got[KEY]?.[chatKey()] || [];
    b.textContent = 'Model history: ' + rows.length;
  }

  async function show() {
    const got = await chrome.storage.local.get(KEY);
    const rows = got[KEY]?.[chatKey()] || [];
    alert(rows.length ? rows.map((r,i) => (i+1) + '. ' + new Date(r.at).toLocaleTimeString() + ' — ' + (r.controls || 'unknown') + ' — ' + r.chars + ' chars').join('\n') : 'No confirmed sends recorded for this conversation yet.');
  }

  document.addEventListener('keydown', attempt, true);
  document.addEventListener('pointerdown', attempt, true);
  document.querySelectorAll('[data-message-author-role="user"]').forEach(n => seen.add(n));
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('popstate', render);
  setInterval(render, 1500);
})();
