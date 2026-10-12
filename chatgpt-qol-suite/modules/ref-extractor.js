ChatQOL.register({
  id: 'ref-extractor', name: 'Branch/Issue Extractor', group: 'Development workflow',
  description: 'Copies task IDs, issue refs, branches and commit hashes from the conversation.',
  stage: 'migrated prototype',
  mount(ctx) {
    ctx.action('Copy Refs', async () => {
      const refs = ctx.refs.scan();
      const output = [
        'REPOSITORIES\n' + (refs.repos.join('\n') || '(none)'),
        'TASK IDS\n' + (refs.ids.join('\n') || '(none)'),
        'ISSUES\n' + (refs.issues.join('\n') || '(none)'),
        'BRANCHES\n' + (refs.branches.join('\n') || '(none)'),
        'COMMITS\n' + (refs.shas.join('\n') || '(none)')
      ].join('\n\n');
      try { await navigator.clipboard.writeText(output); }
      catch (err) { console.warn('[ChatQOL] Clipboard unavailable', err); }
    }, 'Copy GitHub/project references from this chat');
  }
});
