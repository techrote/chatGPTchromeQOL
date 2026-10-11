(() => {
  'use strict';
  const KEY = 'cgptPromptSnapshots';
  const DRAFT = 'cgptPromptRollingDraft';
  const ID = 'cgpt-prompt-snapshotter';
  let lastSnapshotSig = '';
  let draftTimer = 0;

  const editor = () => document.querySelector('#prompt-textarea,[data-testid="prompt-textarea"],textarea,[contenteditable="true"][role="textbox"]');
  const prompt = () => String(editor()?.innerText || editor()?.textContent || editor()?.value || '').trim();

  function root() {
    const e = editor();
    return e?.closest('form') || e?.parentElement?.parentElement?.parentElement || e?.parentElement;
  }

  async function saveSnapshot(reason) {
    const p = prompt();
    if (!p) return;
    const sig = location.pathname + '\n' + p;
    if (sig === lastSnapshotSig) return;
    lastSnapshotSig = sig;
    const rec = { at: Date.now(), iso: new Date().toISOString(), chat: location.href, reason, chars: p.length, text: p };
    const got = await chrome.storage.local.get(KEY);
    const rows = Array.isArray(got[KEY]) ? got[KEY] : [];
    rows.push(rec);
    await chrome.storage.local.set({ [KEY]: rows.slice(-250) });
    render();
  }

  async function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(async () => {
      const p = prompt();
      if (p.length < 500) return;
      await chrome.storage.local.set({ [DRAFT]: { at: Date.now(), chat: location.href, chars: p.length, text: p } });
      render();
    }, 700);
  }

  function attempt(ev) {
    const e = editor();
    if (!e || !prompt()) return;
    if (ev.type === 'keydown') {
      if (ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey && !ev.isComposing && (ev.target === e || e.contains(ev.target))) saveSnapshot('send-attempt');
      return;
    }
    const b = ev.target?.closest?.('button,[role="button"]');
    if (b && root()?.contains(b)) saveSnapshot('send-attempt');
  }

  async function render() {
    let b = document.getElementById(ID);
    if (!b) {
      b = document.createElement('button');
      b.id = ID;
      b.style.cssText = 'position:fixed;right:14px;bottom:324px;z-index:2147483594;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;cursor:pointer';
      b.onclick = inspect;
      document.documentElement.appendChild(b);
    }
    const got = await chrome.storage.local.get([KEY, DRAFT]);
    const rows = Array.isArray(got[KEY]) ? got[KEY] : [];
    b.textContent = 'Snapshots: ' + rows.length + (got[DRAFT] ? ' · draft ' + got[DRAFT].chars : '');
  }

  async function inspect() {
    const got = await chrome.storage.local.get([KEY, DRAFT]);
    const rows = Array.isArray(got[KEY]) ? got[KEY] : [];
    const recent = rows.slice(-10).reverse().map(r => new Date(r.at).toLocaleString() + ' — ' + r.chars + ' chars — ' + r.chat).join('\n');
    if (confirm('Recent prompt snapshots:\n\n' + (recent || 'none') + '\n\nOK = download all snapshots as JSON')) {
      const blob = new Blob([JSON.stringify({ snapshots: rows, rollingDraft: got[DRAFT] || null }, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chatgpt-prompt-snapshots.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  }

  addEventListener('keydown', attempt, true);
  addEventListener('pointerdown', attempt, true);
  addEventListener('input', saveDraft, true);
  setInterval(render, 1500);
  render();
})();
