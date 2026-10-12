/* The only global event interception and module lifecycle owner. */
(() => {
  'use strict';
  const Q = globalThis.ChatQOL;
  if (Q.runtime) return;
  const D = Q.dom;
  let config = Q.normalizeConfig();
  let moduleScopes = new Map();
  const callbacks = new Map();
  const badgeRows = new Map();
  const actionRows = new Map();
  let host, shadow, modal;
  let replaying = false;
  let lastAttempt = { signature: '', at: 0 };
  let pending = null;
  const seen = new WeakSet();
  const MODULE_IDS = new Set(Q.modules.map(m => m.id));

  function emit(type, detail) {
    for (const { fn, scope } of [...(callbacks.get(type) || [])]) {
      if (!scope.active) continue;
      try { fn(detail); } catch (err) { console.error('[ChatQOL] ' + scope.id, err); }
    }
  }

  function ensureUI() {
    if (shadow || !document.documentElement) return;
    host = document.createElement('div');
    host.id = 'chatqol-root';
    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      .badges { position:fixed;bottom:95px;right:14px;z-index:2147483610;display:flex;gap:6px;flex-direction:column;align-items:flex-end;pointer-events:none;font:600 12px/1.3 system-ui,sans-serif; }
      .badge { color:#eee;background:#252525;padding:7px 9px;border:1px solid #515151;border-radius:8px;max-width:300px; }
      .badge.danger { background:#92272b;color:white;border-color:#ac3b3f; }
      .badge.ok { background:#235044;color:white;border-color:#35715f; }
      .actions { position:fixed;left:14px;bottom:95px;z-index:2147483611;display:flex;gap:7px;flex-wrap:wrap;max-width:min(70vw,460px);font:12px system-ui,sans-serif; }
      .actions button { appearance:none;border:1px solid #555;border-radius:9px;padding:6px 10px;background:#202328;color:#eee;cursor:pointer; }
      .actions button:hover { background:#38414d; }
      .veil { position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:rgba(0,0,0,.65);font:14px/1.5 system-ui,sans-serif; }
      .dialog { width:min(480px,calc(100vw - 48px));box-sizing:border-box;background:#202124;color:#f5f5f5;border-radius:16px;border:1px solid #585858;padding:20px;box-shadow:0 16px 55px rgba(0,0,0,.55); }
      .title { font-weight:700;font-size:19px;margin:0 0 9px; }
      .reason { margin:8px 0; }
      .muted { font-size:12px;color:#b9b9b9;overflow-wrap:anywhere; }
      .dialog-actions { display:flex;justify-content:flex-end;gap:10px;margin-top:18px; }
      .dialog-actions button { font:inherit;border-radius:9px;border:1px solid #626262;padding:9px 12px;background:#333;color:white;cursor:pointer; }
      .dialog-actions button.primary { background:#942a30;border-color:#b53a40; }
      button:focus-visible { outline:2px solid #9bb9ff;outline-offset:2px; }
    `;
    shadow.append(style);
    const badges = document.createElement('div'); badges.className = 'badges'; badges.setAttribute('aria-live', 'off');
    const actions = document.createElement('div'); actions.className = 'actions';
    shadow.append(badges, actions);
    document.documentElement.appendChild(host);
  }
  function drawBadges() {
    ensureUI();
    const container = shadow?.querySelector('.badges');
    if (!container) return;
    container.replaceChildren();
    for (const [id, value] of badgeRows) {
      const el = document.createElement('span');
      el.className = 'badge ' + (value.variant || '');
      el.textContent = value.text;
      el.dataset.module = id;
      container.append(el);
    }
  }
  function drawActions() {
    ensureUI();
    const container = shadow?.querySelector('.actions');
    if (!container) return;
    container.replaceChildren();
    for (const [id, value] of actionRows) {
      const el = document.createElement('button');
      el.type = 'button';
      el.dataset.module = id;
      el.textContent = value.text;
      el.title = value.title || value.text;
      el.addEventListener('click', () => { try { value.fn(); } catch (err) { console.error('[ChatQOL]', err); } });
      container.append(el);
    }
  }

  function makeScope(module) {
    const scope = { id: module.id, active: true, disposers: [] };
    const add = (cleanup) => { scope.disposers.push(cleanup); return cleanup; };
    const ctx = {
      id: module.id,
      cleanup(fn) { add(fn); },
      dom: D,
      refs: Q.refs,
      keys: Q.dataKeys,
      get active() { return scope.active; },
      get options() { return config.options[module.id] || {}; },
      on(type, fn) {
        const item = { fn, scope };
        if (!callbacks.has(type)) callbacks.set(type, new Set());
        callbacks.get(type).add(item);
        add(() => callbacks.get(type)?.delete(item));
      },
      listen(target, type, fn, opts) { target.addEventListener(type, fn, opts); add(() => target.removeEventListener(type, fn, opts)); },
      every(fn, ms) { const timer = setInterval(() => { if (scope.active) fn(); }, ms); add(() => clearInterval(timer)); },
      after(fn, ms) { const timer = setTimeout(() => { if (scope.active) fn(); }, ms); add(() => clearTimeout(timer)); return timer; },
      observe(target, fn, options) {
        if (!target) return;
        const o = new MutationObserver(() => { if (scope.active) fn(); });
        o.observe(target, options); add(() => o.disconnect());
      },
      badge(text, variant = '') {
        if (!scope.active) return;
        if (!text) badgeRows.delete(scope.id);
        else badgeRows.set(scope.id, { text, variant });
        drawBadges();
      },
      action(text, fn, title = '') {
        if (!scope.active) return;
        if (!text) actionRows.delete(scope.id);
        else actionRows.set(scope.id, { text, fn, title });
        drawActions();
      },
      append: Q.append,
      updateProject: Q.updateProject,
      localGet: (key) => chrome.storage.local.get(key),
      localSet: (values) => chrome.storage.local.set(values),
      download: Q.localJsonDownload
    };
    scope.ctx = ctx;
    scope.dispose = () => {
      if (!scope.active) return;
      scope.active = false;
      for (const fn of scope.disposers.reverse()) {
        try { fn(); } catch (err) { console.warn('[ChatQOL] cleanup', err); }
      }
      badgeRows.delete(scope.id); actionRows.delete(scope.id);
      drawBadges(); drawActions();
    };
    return scope;
  }

  function reconcile() {
    closeDialog();
    for (const module of Q.modules) {
      const scope = moduleScopes.get(module.id);
      if (scope && !config.enabled[module.id]) { scope.dispose(); moduleScopes.delete(module.id); }
      if (!scope && config.enabled[module.id]) {
        const next = makeScope(module);
        moduleScopes.set(module.id, next);
        try { module.mount?.(next.ctx); } catch (err) {
          console.error('[ChatQOL] Could not initialize ' + module.id, err);
          next.dispose(); moduleScopes.delete(module.id);
        }
      }
    }
    // Config updates also update active badges through the module refresh event.
    emit('settings-changed', null);
  }

  function closeDialog() { modal?.remove(); modal = null; }
  function showDialog(warnings, details) {
    if (modal) return;
    ensureUI();
    const overlay = document.createElement('div');
    modal = overlay;
    overlay.className = 'veil';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'ChatGPT QOL send warning');
    const card = document.createElement('div'); card.className = 'dialog';
    const heading = document.createElement('h2'); heading.className = 'title'; heading.textContent = warnings.length === 1 ? warnings[0].title : 'Review before sending';
    card.append(heading);
    for (const item of warnings) {
      const line = document.createElement('div'); line.className = 'reason';
      if (warnings.length > 1) { const b = document.createElement('strong'); b.textContent = item.title + ': '; line.append(b); }
      line.append(document.createTextNode(item.reason)); card.append(line);
    }
    const sub = document.createElement('div'); sub.className = 'muted';
    sub.textContent = 'This override applies to one synchronous send only. The next attempt will be checked again.';
    card.append(sub);
    const actions = document.createElement('div'); actions.className = 'dialog-actions';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel';
    const proceed = document.createElement('button'); proceed.type = 'button'; proceed.className = 'primary'; proceed.textContent = 'Send anyway once';
    cancel.addEventListener('click', () => { closeDialog(); D.editor()?.focus(); });
    proceed.addEventListener('click', () => {
      const button = D.sendButton();
      if (!button) {
        sub.textContent = 'Send control not available. Close the dialog and try again.';
        return;
      }
      closeDialog();
      replaying = true;
      try { button.click(); }
      finally { replaying = false; }
    });
    actions.append(cancel, proceed); card.append(actions); overlay.append(card);
    overlay.addEventListener('click', ev => { if (ev.target === overlay) { closeDialog(); D.editor()?.focus(); } });
    overlay.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeDialog(); D.editor()?.focus(); } });
    shadow.append(overlay); cancel.focus();
  }

  function inspect(data) {
    const warnings = [];
    for (const module of Q.modules) {
      const scope = moduleScopes.get(module.id);
      if (!scope?.active || !module.inspect) continue;
      try {
        const item = module.inspect(scope.ctx, data);
        if (Array.isArray(item)) warnings.push(...item.filter(Boolean));
        else if (item) warnings.push(item);
      } catch (err) {
        console.error('[ChatQOL] guard error: ' + module.id, err);
        // A failed safety check cannot silently grant a send.
        warnings.push({ title: 'Send check failed', reason: module.name + ' could not verify this send. ' + String(err.message || err) });
      }
    }
    return warnings;
  }
  function markSendAttempt(data) {
    const p = D.prompt(data.editor);
    if (!p) return;
    const signature = location.pathname + '\n' + p;
    const now = performance.now();
    if (signature === lastAttempt.signature && now - lastAttempt.at < 450) return;
    lastAttempt = { signature, at: now };
    const labels = D.modelControls(data.editor);
    pending = { at: Date.now(), iso: new Date().toISOString(), chat: location.pathname,
      url: location.href, text: p, chars: p.length, labels, controls: labels.join(' | ') };
    emit('send-attempt', pending);
  }
  function intercept(ev) {
    if (modal && !replaying) return;
    const meta = D.sendEvent(ev);
    if (!meta) return;
    if (!replaying) {
      const warnings = inspect({ ...meta, prompt: D.prompt(meta.editor), labels: D.modelControls(meta.editor) });
      if (warnings.length) {
        ev.preventDefault(); ev.stopImmediatePropagation();
        showDialog(warnings, meta);
        return;
      }
    }
    // Pointerdown is only preflight, not evidence that a send occurred.
    if (ev.type !== 'pointerdown') markSendAttempt(meta);
  }
  for (const type of ['pointerdown', 'click', 'keydown', 'submit']) window.addEventListener(type, intercept, true);

  function scanUserMessages() {
    const nodes = document.querySelectorAll('[data-message-author-role="user"]');
    for (const n of nodes) {
      if (seen.has(n)) continue;
      seen.add(n);
      if (!pending || Date.now() - pending.at > 30000 || !D.text(n)) continue;
      // Confirm only when observed AFTER a qualifying send attempt. We deliberately
      // avoid inventing browser sends from a historical conversation's DOM.
      const completed = pending;
      pending = null;
      emit('send-confirmed', completed);
    }
  }
  function seedSeen() { document.querySelectorAll('[data-message-author-role="user"]').forEach(n => seen.add(n)); }
  seedSeen();
  const observer = new MutationObserver(scanUserMessages);
  function startMessageObserver() {
    if (document.documentElement) {
      seedSeen();
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } else {
      document.addEventListener('readystatechange', startMessageObserver, { once: true });
    }
  }
  startMessageObserver();

  // Install defaults immediately: guard is live before asynchronous settings hydration.
  reconcile();
  chrome.storage.sync.get(Q.configKey).then(got => {
    config = Q.normalizeConfig(got[Q.configKey]);
    reconcile();
  }).catch(error => console.error('[ChatQOL] settings load', error));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[Q.configKey]) return;
    config = Q.normalizeConfig(changes[Q.configKey].newValue);
    reconcile();
  });
  Q.runtime = { get config() { return config; }, status: () => [...moduleScopes.keys()], inspect, seedSeen };
})();
