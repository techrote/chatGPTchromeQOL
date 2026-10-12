ChatQOL.register({
  id: 'copy-for-codex', name: 'Copy for Codex', group: 'Development workflow',
  description: 'Copy selected text or the latest assistant response, excluding message toolbar buttons.',
  stage: 'migrated prototype',
  mount(ctx) {
    ctx.action('Copy for Codex', async () => {
      const selection = String(window.getSelection?.() || '').trim();
      let content = selection.length >= 20 ? selection : '';
      if (!content) {
        const response = [...document.querySelectorAll('[data-message-author-role="assistant"]')].at(-1);
        if (response) {
          const clone = response.cloneNode(true);
          clone.querySelectorAll('button, svg, [role="button"]').forEach(n => n.remove());
          content = String(clone.innerText || clone.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
        }
      }
      if (!content) return;
      try { await navigator.clipboard.writeText(content); }
      catch (err) { console.warn('[ChatQOL] Clipboard unavailable', err); }
    }, 'Copy selected text or latest assistant response');
  }
});
