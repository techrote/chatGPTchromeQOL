ChatQOL.register({
  id: 'snapshotter', name: 'Prompt Snapshotter', group: 'Development workflow',
  description: 'Stores bounded send-attempt snapshots and rolling long drafts locally; view and export in dashboard.',
  stage: 'migrated prototype',
  fields: [{ key: 'draftChars', label: 'Draft backup minimum (characters)', type: 'number', min: 100, max: 500000 }],
  mount(ctx) {
    let timer = null;
    let lastSignature = '';
    ctx.on('send-attempt', async rec => {
      const signature = rec.chat + '\n' + rec.text;
      if (!ctx.active || !rec.text || signature === lastSignature) return;
      lastSignature = signature;
      await ctx.append(ctx.keys.snapshots, {
        at: rec.at, iso: rec.iso, chat: rec.url, reason: 'send-attempt', chars: rec.chars, text: rec.text
      }, 250);
    });
    function onInput() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!ctx.active) return;
        const p = ctx.dom.prompt();
        if (p.length < ctx.options.draftChars) return;
        ctx.localSet({ [ctx.keys.draft]: { at: Date.now(), chat: location.href, chars: p.length, text: p } });
      }, 700);
    }
    ctx.listen(document, 'input', onInput, true);
    // The timeout belongs to this module, even if the module is disabled mid-draft.
    ctx.on('settings-changed', () => { clearTimeout(timer); });
    ctx.action('Snapshots', async () => {
      const v = await ctx.localGet([ctx.keys.snapshots, ctx.keys.draft]);
      if (ctx.active) ctx.download('chatgpt-qol-snapshots.json', { snapshots: v[ctx.keys.snapshots] || [], rollingDraft: v[ctx.keys.draft] || null });
    }, 'Export local prompt backups');
    // Native timer is cleared on disable by explicit lifecycle event below.
    ctx.cleanup(() => clearTimeout(timer));
  }
});
