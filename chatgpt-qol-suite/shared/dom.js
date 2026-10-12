/* Composer adapter: deliberately strict. Never treat general page buttons/editors as send controls. */
(() => {
  'use strict';
  const Q = globalThis.ChatQOL;
  const SEND = [
    'button[data-testid="send-button"]', 'button[data-testid="composer-send-button"]',
    'button[data-testid="composer-submit-button"]', 'button[aria-label="Send message" i]',
    'button[aria-label="Send prompt" i]', 'button[aria-label="Send" i]',
    'button[title="Send message" i]', 'button[title="Send" i]', 'button[type="submit"]'
  ].join(',');
  const EDITORS = [
    '#prompt-textarea', '[data-testid="prompt-textarea"]',
    'textarea[placeholder*="Ask ChatGPT" i]', 'textarea[placeholder*="Message ChatGPT" i]',
    '[contenteditable="true"][data-placeholder*="Ask ChatGPT" i]',
    '[contenteditable="true"][aria-label*="Message ChatGPT" i]'
  ];
  const text = (el) => String(el?.innerText ?? el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  function visible(el) {
    if (!(el instanceof Element)) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.bottom < 0 || r.top > innerHeight) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0;
  }
  function editor() {
    for (const selector of EDITORS) {
      const found = [...document.querySelectorAll(selector)]
        .filter(visible).sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
      if (found.length) return found[0];
    }
    // Accept a generic editable only when paired with an explicit send control in a real form.
    for (const form of document.querySelectorAll('form')) {
      if (!visible(form) || !form.querySelector(SEND)) continue;
      const candidates = [...form.querySelectorAll('textarea, [contenteditable="true"]')]
        .filter(visible).filter(el => el.getBoundingClientRect().bottom > innerHeight / 2);
      if (candidates.length === 1) return candidates[0];
    }
    return null;
  }
  function root(e = editor()) {
    if (!e) return null;
    const form = e.closest('form');
    if (form?.querySelector(SEND)) return form;
    let node = e.parentElement;
    for (let i = 0; node && i < 8; i++, node = node.parentElement) {
      if (node === document.body || node === document.documentElement) break;
      if (node.getBoundingClientRect().height <= 550 && node.querySelector(SEND)) return node;
    }
    return form;
  }
  function realSend(b, r) {
    if (!(b instanceof HTMLButtonElement) || !r?.contains(b) || !b.matches(SEND) || b.disabled) return false;
    const meta = [b.getAttribute('aria-label'), b.getAttribute('title'), b.getAttribute('data-testid')].filter(Boolean).join(' ');
    return !/\b(stop|cancel|interrupt|regenerate)\b/i.test(meta);
  }
  function sendButton(e = editor()) {
    const r = root(e);
    return [...(r?.querySelectorAll(SEND) || [])].find(b => realSend(b, r) && visible(b)) || null;
  }
  function prompt(e = editor()) {
    if (!e) return '';
    return e instanceof HTMLTextAreaElement || e instanceof HTMLInputElement ? e.value.trim() : text(e);
  }
  function modelControls(e = editor()) {
    const r = root(e);
    if (!r || !e) return [];
    const er = e.getBoundingClientRect();
    const buttons = new Set(r.querySelectorAll('button, [role="button"]'));
    for (const b of document.querySelectorAll('button, [role="button"]')) {
      if (!visible(b)) continue;
      const br = b.getBoundingClientRect();
      const near = br.right > er.left - 110 && br.left < er.right + 110 && br.bottom > er.top - 180 && br.top < er.bottom + 180;
      if (near && (/model/i.test([b.getAttribute('aria-label'), b.getAttribute('data-testid')].join(' ')) ||
           /^(?:gpt[\s-]*)?5\.6(?=$|\s|[^\d.])/i.test(text(b)))) buttons.add(b);
    }
    const send = sendButton(e);
    return [...buttons].filter(b => {
      if (!visible(b) || b === send || b.contains(e) || e.contains(b)) return false;
      const br = b.getBoundingClientRect();
      return (br.right > er.left - 110 && br.left < er.right + 110 && br.bottom > er.top - 180 && br.top < er.bottom + 180) ||
        (r.contains(b) && /model/i.test([b.getAttribute('aria-label'), b.getAttribute('data-testid')].join(' ')));
    }).map(text).filter(Boolean);
  }
  function sendEvent(ev) {
    const e = editor();
    if (!e) return null;
    const r = root(e);
    const button = sendButton(e);
    if (ev.type === 'pointerdown' || ev.type === 'click') {
      const path = ev.composedPath?.() || [ev.target];
      const b = path.find(x => x instanceof HTMLButtonElement);
      if (realSend(b, r)) return { editor: e, button: b, kind: 'button' };
    }
    if (ev.type === 'keydown') {
      if (ev.key !== 'Enter' || ev.shiftKey || ev.ctrlKey || ev.altKey || ev.metaKey || ev.isComposing || ev.keyCode === 229) return null;
      const path = ev.composedPath?.() || [ev.target];
      if ((path.includes(e) || ev.target === e || e.contains(ev.target)) && (prompt(e) || button)) {
        return { editor: e, button, kind: 'enter' };
      }
    }
    if (ev.type === 'submit' && ev.target instanceof HTMLFormElement && ev.target === e.closest('form') && ev.target.querySelector(SEND)) {
      return { editor: e, button, kind: 'submit' };
    }
    return null;
  }
  function streaming() {
    return ['button[data-testid="stop-button"]', 'button[aria-label*="Stop generating" i]',
      'button[aria-label*="Stop response" i]', '[data-testid*="stop"][role="button"]']
      .some(selector => [...document.querySelectorAll(selector)].some(visible));
  }
  Q.dom = { SEND, visible, text, editor, root, sendButton, prompt, modelControls, sendEvent, streaming };
})();
