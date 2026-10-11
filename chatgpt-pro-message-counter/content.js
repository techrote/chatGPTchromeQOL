(() => {
  'use strict';
  const KEY = 'cgptProCounterEvents';
  const ID = 'cgpt-pro-counter';
  const seen = new WeakSet();
  let pending = null;

  const editor = () => document.querySelector('#prompt-textarea,[data-testid="prompt-textarea"],textarea,[contenteditable="true"][role="textbox"]');
  const txt = el => String(el?.innerText || el?.textContent || el?.value || '').replace(/\s+/g, ' ').trim();
  const prompt = () => txt(editor());

  function composerRoot() {
    const e = editor();
    if (!e) return null;
    const f = e.closest('form');
    if (f) return f;
    let n = e.parentElement;
    for (let i = 0; n && i < 7; i++, n = n.parentElement) {
      if (n.querySelector('button')) return n;
    }
    return e.parentElement;
  }

  function visibleControlText() {
    const root = composerRoot();
    if (!root) return '';
    return [...root.querySelectorAll('button,[role="button"],[aria-haspopup]')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
      })
      .map(el => [txt(el), el.getAttribute('aria-label'), el.getAttribute('title')].filter(Boolean).join(' '))
      .join(' | ');
  }

  function classify(label) {
    if (/\bpro\b/i.test(label)) return 'Pro';
    if (/\b5\.6\b/.test(label)) return 'GPT-5.6';
    if (/extra\s*high/i.test(label)) return 'Unknown / Extra High';
    return label || 'Unknown';
  }

  function capturePending() {
    const p = prompt();
    if (!p) return;
    const label = visibleControlText();
    pending = { at: Date.now(), chat: location.pathname, label, model: classify(label), chars: p.length, preview: p.slice(0, 120) };
  }

  function sendAttempt(ev) {
    if (ev.type === 'keydown') {
      if (ev.key !== 'Enter' || ev.shiftKey || ev.ctrlKey || ev.altKey || ev.metaKey || ev.isComposing) return;
      if (!editor()?.contains(ev.target) && ev.target !== editor()) return;
      capturePending();
      return;
    }
    const b = ev.target?.closest?.('button,[role="button"]');
    if (!b || !composerRoot()?.contains(b)) return;
    if (!prompt()) return;
    capturePending();
  }

  async function confirmSend(node) {
    if (!pending) return;
    const actual = txt(node);
    if (!actual) return;
    const rec = { ...pending, sentTextChars: actual.length };
    pending = null;
    const got = await chrome.storage.local.get(KEY);
    const events = Array.isArray(got[KEY]) ? got[KEY] : [];
    events.push(rec);
    await chrome.storage.local.set({ [KEY]: events.slice(-5000) });
    render();
  }

  function scanMessages() {
    document.querySelectorAll('[data-message-author-role="user"]').forEach(n => {
      if (seen.has(n)) return;
      seen.add(n);
      if (pending) confirmSend(n);
    });
  }

  async function render() {
    let badge = document.getElementById(ID);
    if (!badge) {
      badge = document.createElement('button');
      badge.id = ID;
      badge.style.cssText = 'position:fixed;right:14px;bottom:132px;z-index:2147483600;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;cursor:pointer';
      badge.title = 'Local counter only. Click for details.';
      badge.onclick = showDetails;
      document.documentElement.appendChild(badge);
    }
    const got = await chrome.storage.local.get(KEY);
    const events = Array.isArray(got[KEY]) ? got[KEY] : [];
    const now = Date.now();
    const day = now - 86400000;
    const week = now - 7 * 86400000;
    const isPro = r => r.model === 'Pro';
    badge.textContent = 'Pro local: ' + events.filter(r => isPro(r) && r.at >= day).length + ' today · ' + events.filter(r => isPro(r) && r.at >= week).length + ' / 7d';
  }

  async function showDetails() {
    const got = await chrome.storage.local.get(KEY);
    const events = Array.isArray(got[KEY]) ? got[KEY] : [];
    const counts = {};
    for (const r of events) counts[r.model] = (counts[r.model] || 0) + 1;
    alert('Local ChatGPT send counts\n\n' + Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v]) => k + ': ' + v).join('\n') + '\n\nOnly sends observed in this browser are counted.');
  }

  document.addEventListener('keydown', sendAttempt, true);
  document.addEventListener('pointerdown', sendAttempt, true);
  document.querySelectorAll('[data-message-author-role="user"]').forEach(n => seen.add(n));
  new MutationObserver(scanMessages).observe(document.documentElement, { childList: true, subtree: true });
  render();
})();
