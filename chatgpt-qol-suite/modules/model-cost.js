ChatQOL.register({
  id: 'model-cost', name: 'Model Cost Guard', group: 'Sending & safety',
  description: 'Prompts for confirmation when a short message uses a visibly high-cost model/effort.',
  stage: 'migrated prototype',
  fields: [{ key: 'shortChars', label: 'Short prompt threshold (characters)', type: 'number', min: 40, max: 10000 }],
  inspect(ctx, data) {
    if (!data.prompt) return null;
    const heavy = data.labels.some(x => /\bpro\b|extra\s*high/i.test(x));
    const short = data.prompt.length < ctx.options.shortChars || data.prompt.trim().split(/\s+/).length < 60;
    if (!heavy || !short) return null;
    return { title: 'High-effort model on short prompt',
      reason: `Visible model controls: ${data.labels.join(' | ') || 'unknown'}. Prompt: ${data.prompt.length} characters.` };
  },
  mount(ctx) { /* Shared send pipeline; no separate event capture. */ }
});
