ChatQOL.register({
  id: 'model-history', name: 'Conversation Model History', group: 'Usage & monitoring',
  description: 'Per-chat model/effort observations for confirmed sends, stored locally.',
  stage: 'migrated prototype',
  mount(ctx) {
    ctx.on('send-confirmed', async rec => {
      const record = { at: rec.at, iso: rec.iso, chat: rec.chat, controls: rec.controls, chars: rec.chars };
      // A flat bounded event stream avoids clobbering per-chat maps on concurrent sends.
      await ctx.append(ctx.keys.history, record, 10000);
    });
  }
});
