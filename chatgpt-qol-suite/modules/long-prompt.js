ChatQOL.register({
  id: 'long-prompt', name: 'Long-Prompt Warning', group: 'Sending & safety',
  description: 'Approximate local token estimate and configurable character threshold before sending.',
  stage: 'migrated prototype',
  fields: [{ key: 'chars', label: 'Warn at character count', type: 'number', min: 200, max: 500000 },
           { key: 'showBadge', label: 'Show live counter', type: 'checkbox' }],
  inspect(ctx, data) {
    const count = data.prompt.length;
    const threshold = Math.max(200, ctx.options.chars ?? 12000);
    return count >= threshold ? {
      title: 'Long prompt warning',
      reason: `${count.toLocaleString()} characters (~${Math.ceil(count / 4).toLocaleString()} rough tokens).`
    } : null;
  },
  mount(ctx) {
    function update() {
      if (!ctx.options.showBadge) return ctx.badge(null);
      const p = ctx.dom.prompt();
      if (!p) return ctx.badge(null);
      const warn = p.length >= ctx.options.chars;
      ctx.badge(`Prompt: ${p.length.toLocaleString()} chars · ~${Math.ceil(p.length / 4).toLocaleString()} tokens`, warn ? 'danger' : '');
    }
    ctx.listen(document, 'input', update, true);
    ctx.on('settings-changed', update);
    ctx.every(update, 1800); update();
  }
});
