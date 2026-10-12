ChatQOL.register({
  id: 'send-guard', name: 'GPT-5.6 Send Guard', group: 'Sending & safety',
  description: 'Warns on a composer send unless the visible model button begins with 5.6; exact one-shot override.',
  stage: 'field-tested standalone; migrated',
  inspect(_ctx, event) {
    const is56 = event.labels.some(label => /^(?:gpt[\s-]*)?5\.6(?=$|\s|[^\d.])/i.test(label));
    if (is56) return null;
    return {
      title: 'GPT-5.6 is not visible',
      reason: 'The composer model control does not visibly begin with 5.6. Another model may be selected. ' +
        (event.labels.length ? 'Nearby controls: ' + event.labels.join(' | ').slice(0, 180) : 'No model label confirmed.')
    };
  },
  mount(ctx) {
    function update() {
      const e = ctx.dom.editor();
      if (!e) return ctx.badge(null);
      const labels = ctx.dom.modelControls(e);
      const ok = labels.some(v => /^(?:gpt[\s-]*)?5\.6(?=$|\s|[^\d.])/i.test(v));
      ctx.badge(ok ? null : 'Send Guard: 5.6 not visible', 'danger');
    }
    ctx.every(update, 800);
    ctx.listen(window, 'focus', update);
    ctx.listen(document, 'visibilitychange', update);
    ctx.on('settings-changed', update);
    update();
  }
});
