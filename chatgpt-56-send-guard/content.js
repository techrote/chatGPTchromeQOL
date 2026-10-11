(() => {
  'use strict';

  const MARKER_RE = /(^|\s|[^0-9])5\.6([^0-9]|$)/;
  const EXT_ID = 'gpt56-send-guard';
  const BYPASS_MS = 900;

  let bypassUntil = 0;
  let warningOpen = false;
  let lastUnsafe = null;

  function visible(el) {
    if (!(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false;
    if (Number(style.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  }

  function normalizedText(el) {
    return String(el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function getPromptEditor() {
    const selectors = [
      '#prompt-textarea',
      '[data-testid="prompt-textarea"]',
      'textarea[placeholder*="ChatGPT" i]',
      'textarea[placeholder*="message" i]',
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"]'
    ];

    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (visible(el)) return el;
      }
    }
    return null;
  }

  function promptText(editor = getPromptEditor()) {
    if (!editor) return '';
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      return editor.value.trim();
    }
    return normalizedText(editor);
  }

  function getComposerContainer(editor) {
    if (!editor) return null;

    const form = editor.closest('form');
    if (form && visible(form)) return form;

    // Walk upward until we find a compact container that includes the editor
    // and at least one button. Avoid ever reaching the conversation transcript.
    let node = editor.parentElement;
    for (let i = 0; node && i < 8; i += 1, node = node.parentElement) {
      const r = node.getBoundingClientRect();
      if (r.height > 0 && r.height <= 260 && node.querySelector('button, [role="button"]')) {
        return node;
      }
    }
    return editor.parentElement;
  }

  function nearbyVisibleControlTexts(editor) {
    if (!editor) return [];
    const er = editor.getBoundingClientRect();
    const out = [];

    for (const el of document.querySelectorAll('button, [role="button"], [aria-haspopup]')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      const horizontal = r.right >= er.left - 120 && r.left <= er.right + 120;
      const vertical = r.bottom >= er.top - 140 && r.top <= er.bottom + 140;
      if (!horizontal || !vertical) continue;
      const text = normalizedText(el);
      if (text) out.push(text);
    }
    return [...new Set(out)];
  }

  function markerState() {
    const editor = getPromptEditor();
    if (!editor) {
      return { ok: false, reason: 'Prompt editor not found', editor: null, detail: '' };
    }

    const composer = getComposerContainer(editor);
    const composerText = normalizedText(composer);
    if (MARKER_RE.test(composerText)) {
      return { ok: true, reason: '5.6 visible in composer', editor, detail: composerText };
    }

    const controls = nearbyVisibleControlTexts(editor);
    if (controls.some((text) => MARKER_RE.test(text))) {
      return { ok: true, reasoon: '5.6 visible in nearby control', editor, detail: controls.join(' | ') };
    }

    return {
      ok: false,
      reason: '5.6 is not visible in the composer controls',
      editor,
      detail: controls.length ? controls.join(' | ') : composerText
    };
  }

  function eventElement(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const item of path) {
      if (item instanceof Element) return item;
    }
    return event.target instanceof Element ? event.target : null;
  }

  function sendButtonFromEvent(event) {
    const origin = eventElement(event);
    const button = origin?.closest?.('button, [role="button"]');
    if (!button || !visible(button)) return null;

    const meta = [
      button.getAttribute('aria-label'),
      button.getAttribute('data-testid'),
      button.getAttribute('title'),
      button.getAttribute('name')
    ].filter(Boolean).join(' ').toLowerCase();

    // Never interfere with stopping an in-progress response.
    if (/stop|cancel|interrupt/.test(meta)) return null;
    if (/send|submit/.test(meta)) return button;

    const editor = getPromptEditor();
    if (!editor || !promptText(editor)) return null;

    const composer = getComposerContainer(editor);
    if (composer && !composer.contains(button)) return null;

    // Current ChatGPT send button is icon-only at the far right of the composer.
    const br = button.getBoundingClientRect();
    const er = editor.getBoundingClientRect();
    const nearRight = br.left >= er.right - 160;
    const sameRow = br.bottom >= er.top - 30 && br.top <= er.bottom + 80;
    const iconOnly = !normalizedText(button);
    return nearRight && sameRow && iconOnly ? button : null;
  }

  function findSendButton(editor = getPromptEditor()) {
    if (!editor) return null;
    const composer = getComposerContainer(editor) || document;

    const selectors = [
      'button[data-testid="send-button"]',
      'button[data-testid*="send" i]',
      'button[aria-label*="send" i]',
      '[role="button"][aria-label*="send" i]'
    ];
    for (const selector of selectors) {
      const el = composer.querySelector(selector) || document.querySelector(selector);
      if (el && visible(el) && !/stop|cancel|interrupt/i.test([
        el.getAttribute('aria-label'), el.getAttribute('data-testid'), el.getAttribute('title')
      ].filter(Boolean).join(' '))) return el;
    }

    const er = editor.getBoundingClientRect();
    return [...composer.querySelectorAll('button, [role="button"]')]
      .filter(visible)
      .filter((el) => !normalizedText(el))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left >= er.right - 160 && r.bottom >= er.top - 30 && r.top <= er.bottom + 80;
      })
      .sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left)[0] || null;
  }

  function isSendEnter(event) {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) {
      return false;
    }
    const editor = getPromptEditor();
    if (!editor || !promptText(editor)) return false;

    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    return path.includes(editor) || event.target === editor || editor.contains?.(event.target);
  }

  function isComposerSubmit(event) {
    const editor = getPromptEditor();
    if (!editor || !promptText(editor)) return false;
    const form = editor.closest('form');
    return !!form && event.target === form;
  }

  function swallow(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function removeWarning() {
    document.getElementById(`${EXT_ID}-modal`)?.remove();
    warningOpen = false;
  }

  function replaySend() {
    removeWarning();
    bypassUntil = performance.now() + BYPASS_MS;
    const editor = getPromptEditor();
    const button = findSendButton(editor);
    if (button) {
      button.click();
      return;
    }

    // Fallback for an unexpected DOM revision: re-dispatch Enter into the editor.
    if (editor) {
      editor.focus();
      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', bubbles: true, cancelable: true, composed: true
      }));
    }
  }

  function showWarning(state) {
    if (warningOpen) return;
    warningOpen = true;

    const overlay = document.createElement('div');
    overlay.id = `${EXT_ID}-modal`;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="g56-card">
        <div class="g56-title">GPT-5.6 is not visible</div>
        <div class="g56-body">The current model control does not visibly contain <strong>5.6</strong>. This may mean GPT-6 Chat is selected.</div>
        <div class="g56-detail"></div>
        <div class="g56-actions">
          <button type="button" class="g56-cancel">Cancel</button>
          <button type="button" class="g56-send">Send anyway once</button>
        </div>
      </div>`;

    const detail = overlay.querySelector('.g56-detail');
    detail.textContent = state.detail ? `Visible nearby controls: ${state.detail.slice(0, 280)}` : state.reason;

    overlay.querySelector('.g56-cancel').addEventListener('click', () => {
      removeWarning();
      getPromptEditor()?.focus();
    });
    overlay.querySelector('.g56-send').addEventListener('click', replaySend);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        removeWarning();
        getPromptEditor()?.focus();
      }
    });
    overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        removeWarning();
        getPromptEditor()?.focus();
      }
    });

    document.documentElement.appendChild(overlay);
    overlay.querySelector('.g56-cancel').focus();
  }

  function guard(event) {
    if (performance.now() < bypassUntil) return true;
    const state = markerState();
    lastUnsafe = !state.ok;
    updateBadge(state);
    if (state.ok) return true;
    swallow(event);
    showWarning(state);
    return false;
  }

  function onPointerLike(event) {
    if (performance.now() < bypassUntil) return;
    if (!sendButtonFromEvent(event)) return;
    guard(event);
  }

  function onKeydown(event) {
    if (performance.now() < bypassUntil) return;
    if (!isSendEnter(event)) return;
    guard(event);
  }

  function onSubmit(event) {
    if (performance.now() < bypassUntil) return;
    if (!isComposerSubmit(event)) return;
    guard(event);
  }

  // Listen at window capture phase so the guard runs before ChatGPT/React handlers.
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click']) {
    window.addEventListener(type, onPointerLike, true);
  }
  window.addEventListener('keydown', onKeydown, true);
  window.addEventListener('submit', onSubmit, true);

  function ensureStyles() {
    if (document.getElementById(`${EXT_ID}-style`)) return;
    const style = document.createElement('style');
    style.id = `${EXT_ID}-style`;
    style.textContent = `
      #${EXT_ID}-badge {
        position: fixed; right: 14px; bottom: 96px; z-index: 2147483645;
        font: 600 12px/1.2 system-ui, -apple-system, Segoe UI, sans-serif;
        padding: 7px 9px; border-radius: 8px; color: #fff;
        background: #9f1d20; box-shadow: 0 2px 12px rgba(0,0,0,.28);
        pointer-events: none; user-select: none;
      }
      #${EXT_ID}-modal {
        position: fixed; inset: 0; z-index: 2147483647;
        display: grid; place-items: center; padding: 24px;
        background: rgba(0,0,0,.62); font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      }
      #${EXT_ID}-modal .g56-card {
        width: min(470px, calc(100vw - 48px)); box-sizing: border-box;
        border: 1px solid rgba(255,255,255,.16); border-radius: 16px;
        background: #202020; color: #f5f5f5; padding: 20px;
        box-shadow: 0 18px 60px rgba(0,0,0,.5);
      }
      #${EXT_ID}-modal .g56-title { font-size: 19px; font-weight: 700; margin-bottom: 10px; }
      #${EXT_ID}-modal .g56-body { font-size: 14px; line-height: 1.45; }
      #${EXT_ID}-modal .g56-detail { margin-top: 11px; font-size: 11px; line-height: 1.35; color: #aaa; word-break: break-word; }
      #${EXT_ID}-modal .g56-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 18px; }
      #${EXT_ID}-modal button {
        appearance: none; border: 1px solid #555; border-radius: 9px; padding: 9px 12px;
        background: #2d2d2d; color: #fff; cursor: pointer; font: inherit;
      }
      #${EXT_ID}-modal button:focus { outline: 2px solid #aaa; outline-offset: 2px; }
      #${EXT_ID}-modal .g56-send { background: #7d2023; border-color: #a33; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function updateBadge(state = markerState()) {
    ensureStyles();
    let badge = document.getElementById(`${EXT_ID}-badge`);
    if (state.ok || !state.editor) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('div');
      badge.id = `${EXT_ID}-badge`;
      badge.textContent = 'Send Guard: 5.6 not visible';
      document.documentElement.appendChild(badge);
    }
  }

  function poll() {
    const state = markerState();
    if (lastUnsafe !== !state.ok || document.hidden === false) updateBadge(state);
    lastUnsafe = !state.ok;
  }

  // Visible red badge is intentional: it confirms the extension is actually loaded
  // when an unsafe (non-5.6) composer is on screen.
  setInterval(poll, 700);
  window.addEventListener('focus', poll, true);
  document.addEventListener('visibilitychange', poll, true);
  queueMicrotask(poll);
})();
