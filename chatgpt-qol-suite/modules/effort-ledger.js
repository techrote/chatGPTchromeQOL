ChatQOL.register({
  id: 'effort-ledger', name: 'Model/Effort Ledger', group: 'Usage & monitoring',
  description: 'Local timestamped ledger of confirmed sends, visible model, effort and message length.',
  stage: 'migrated prototype',
  mount(ctx) {
    ctx.on('send-confirmed', async rec => {
      const labels = rec.controls;
      const model = /\bpro\b/i.test(labels) ? 'Pro' : /\b5\.6\b/.test(labels) ? 'GPT-5.6' : /\b6\b/.test(labels) ? 'GPT-6' : 'Unknown';
      const effort = /extra\s*high/i.test(labels) ? 'Extra High' : /\bhigh\b/i.test(labels) ? 'High' : /\bmedium\b/i.test(labels) ? 'Medium' : /\blow\b/i.test(labels) ? 'Low' : 'Unknown';
      await ctx.append(ctx.keys.ledger, { ts: rec.iso, epoch: rec.at, chat: rec.url,
        chars: rec.chars, controlText: labels, model, effort }, 10000);
    });
  }
});
