ChatQOL.register({
  id: 'accidental-send', name: 'Accidental Send Guard', group: 'Sending & safety',
  description: 'Detects unfinished-looking prompts using punctuation, delimiters and code-fence heuristics.',
  stage: 'migrated prototype',
  inspect(_ctx, data) {
    const p = data.prompt;
    if (!p) return null;
    const reasons = [];
    if (((p.match(/```/g) || []).length % 2) === 1) reasons.push('unclosed triple-backtick code fence');
    if (/[:;,]$/.test(p)) reasons.push('ends with punctuation suggesting more text');
    if (/[([{]$/.test(p)) reasons.push('ends with an opening delimiter');
    if (/\b(and|or|because|with|for|to)$/i.test(p)) reasons.push('ends with a linking word');
    if (/\\$/.test(p)) reasons.push('ends with a backslash');
    return reasons.length ? { title: 'Prompt may be unfinished', reason: reasons.join('; ') } : null;
  },
  mount(ctx) { /* Single shared send pipeline handles detection; no global listeners. */ }
});
