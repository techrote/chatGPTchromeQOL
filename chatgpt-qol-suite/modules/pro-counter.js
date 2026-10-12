ChatQOL.register({
  id: 'pro-counter', name: 'Pro Message Counter', group: 'Usage & monitoring',
  description: 'Counts browser-observed confirmed sends classified from visible model controls. Not an account quota.',
  stage: 'migrated prototype',
  mount(ctx) {
    async function update() {
      const got = await ctx.localGet(ctx.keys.proCounter);
      if (!ctx.active) return;
      const rows = Array.isArray(got[ctx.keys.proCounter]) ? got[ctx.keys.proCounter] : [];
      const now = Date.now();
      const pro = rows.filter(r => r.model === 'Pro');
      ctx.badge(`Local Pro: ${pro.filter(x => x.at >= now - 86400000).length} / 24h · ${pro.filter(x => x.at >= now - 604800000).length} / 7d`);
    }
    ctx.on('send-confirmed', async rec => {
      const label = rec.controls;
      const model = /\bpro\b/i.test(label) ? 'Pro' : /\b5\.6\b/.test(label) ? 'GPT-5.6' : 'Unknown';
      await ctx.append(ctx.keys.proCounter, { at: rec.at, chat: rec.chat, label, model, chars: rec.chars }, 5000);
      if (ctx.active) update();
    });
    ctx.every(update, 30000); update();
  }
});
