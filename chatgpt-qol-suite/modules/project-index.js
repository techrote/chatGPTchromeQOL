ChatQOL.register({
  id: 'project-index', name: 'Chat Project Index', group: 'Development workflow',
  description: 'Indexes observed chat URLs, GitHub repositories, and task IDs for offline export.',
  stage: 'migrated prototype',
  mount(ctx) {
    let lastSignature = '';
    async function index() {
      const data = ctx.refs.scan();
      if (!data.repos.length && !data.ids.length) return;
      const signature = location.pathname + JSON.stringify({ r: data.repos, i: data.ids });
      if (signature === lastSignature) return;
      lastSignature = signature;
      await ctx.updateProject(location.pathname, {
        chat: location.href, title: document.title, updatedAt: Date.now(), repos: data.repos, ids: data.ids
      });
    }
    ctx.every(index, 5000);
    ctx.listen(window, 'popstate', index);
    ctx.action('Project Index', async () => {
      const got = await ctx.localGet(ctx.keys.projects);
      if (ctx.active) ctx.download('chatgpt-qol-project-index.json', got[ctx.keys.projects] || {});
    }, 'Export locally indexed chat -> task references');
    index();
  }
});
