ChatQOL.register({
  id: 'repo-badge', name: 'Repo Context Badge', group: 'Development workflow',
  description: 'Detects GitHub repository references in visible conversation messages, not sidebars.',
  stage: 'migrated prototype',
  fields: [{ key: 'showBadge', label: 'Show repository badge', type: 'checkbox' }],
  mount(ctx) {
    function update() {
      if (!ctx.options.showBadge) return ctx.badge(null);
      const repos = ctx.refs.scan().repos;
      ctx.badge(repos.length ? `Repo: ${repos.slice(-2).join(' · ')}` : null);
    }
    ctx.every(update, 3500);
    ctx.on('settings-changed', update); update();
  }
});
