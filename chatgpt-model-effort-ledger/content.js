(() => {
  'use strict';
  const KEY = 'cgptModelEffortLedger';
  const ID = 'cgpt-model-ledger';
  const seen = new WeakSet();
  let pending = null;

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

  function parse(controlText) {
    const model =
      /\bpro\b/i.test(controlText) ? 'Pro' :
      /\b5\.6\b/.test(controlText) ? 'GPT-5.6' :
      /\b6\b/.test(controlText) ? 'GPT-6' : 'Unknown';
    const effort =
      /extra\s*high/i.test(controlText) ? 'Extra High' :
      /\bhigh\b/i.test(controlText) ? 'High' :
      /\bmedium\b/i.test(controlText) ? 'Medium' :
      /\blow\b/i.test(controlText) ? 'Low' : 'Unknown';
    return { model, effort };
  }

  function capture() {
    const p = txt(editor());
    if (!p) return;
    const controlText = controls();
    pending = { ts: new Date().toISOString(), epoch: Date.now(), chat: location.href, chars: p.length, controlText, ...parse(controlText) };
  }

  function attempt(ev) {
    if (ev.type === 'keydown') {
      if (ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey && !ev.isComposing && (ev.target === editor() || editor()?.contains(ev.target))) capture();
      return;
    }
    const b = ev.target?.closest?.('button,[role="button"]');
    if (b && root()?.contains(b) && txt(editor())) capture();
  }

  async function confirmed(node) {
    if (!pending || !txt(node)) return;
    const rec = pending;
    pending = null;
    const got = await chrome.storage.local.get(KEY);
    const rows = Array.isArray(got[KEY]) ? got[KEY] : [];
    rows.push(rec);
    await chrome.storage.local.set({ [KEY]: rows.slice(-10000) });
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
      b.style.cssText = 'position:fixed;right:14px;bottom:164px;z-index:2147483599;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;cursor:pointer';
      b.onclick = openLedger;
      document.documentElement.appendChild(b);
    }
    const got = await chrome.storage.local.get(KEY);
    const rows = Array.isArray(got[KEY]) ? got[KEY] : [];
    b.textContent = 'Ledger: ' + rows.length;
  }

  async function openLedger() {
    const got = await chrome.storage.local.get(KEY);
    const rows = Array.isArray(got[KEY]) ? got[KEY] : [];
    const recent = rows.slice(-20).reverse().map(r => r.ts.slice(0,19).replace('T',' ') + '  ' + r.model + ' / ' + r.effort + '  ' + r.chars + ' chars').join('\n');
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    if (confirm('Last 20 sends:\n\n' + recent + '\n\nOK = download full JSON ledger\nCancel = close')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chatgpt-model-effort-ledger.json';
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  document.addEventListener('keydown', attempt, true);
  document.addEventListener('pointerdown', attempt, true);
  document.querySelectorAll('[data-message-author-role="user"]').forEach(n => seen.add(n));
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  render();
})();
