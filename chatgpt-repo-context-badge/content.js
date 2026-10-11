(() => {
  'use strict';
  const ID = 'cgpt-repo-context-badge';
  let lastSig = '';

  function collect() {
    const found = [];
    const add = (type, value, url) => {
      const key = type + '|' + value + '|' + (url || '');
      if (!found.some(x => x.key === key)) found.push({key, type, value, url});
    };

    document.querySelectorAll('a[href*="github.com/"]').forEach(a => {
      try {
        const u = new URL(a.href);
        const p = u.pathname.split('/').filter(Boolean);
        if (p.length >= 2) {
          const repo = p[0] + '/' + p[1].replace(/\.git$/, '');
          add('repo', repo, 'https://github.com/' + repo);
          if (p[2] === 'issues' && /^\d+$/.test(p[3] || '')) add('issue', repo + '#' + p[3], a.href);
          if (p[2] === 'pull' && /^\d+$/.test(p[3] || '')) add('PR', repo + '#' + p[3], a.href);
        }
      } catch {}
    });

    const body = document.body?.innerText || '';
    const re = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/(issues|pull)\/(\d+))?/g;
    let m;
    while ((m = re.exec(body))) {
      const repo = m[1] + '/' + m[2].replace(/\.git$/, '');
      add('repo', repo, 'https://github.com/' + repo);
      if (m[3] && m[4]) add(m[3] === 'pull' ? 'PR' : 'issue', repo + '#' + m[4], m[0]);
    }
    return found;
  }

  function render() {
    const items = collect();
    const sig = items.map(x => x.key).join('\n');
    if (sig === lastSig && document.getElementById(ID)) return;
    lastSig = sig;

    let b = document.getElementById(ID);
    if (!b) {
      b = document.createElement('button');
      b.id = ID;
      b.style.cssText = 'position:fixed;right:14px;bottom:356px;z-index:2147483593;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;cursor:pointer;max-width:330px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      b.onclick = () => {
        const now = collect();
        alert(now.length ? now.map(x => x.type + ': ' + x.value).join('\n') : 'No GitHub repository context detected in this chat.');
      };
      document.documentElement.appendChild(b);
    }

    const repos = items.filter(x => x.type === 'repo').map(x => x.value);
    b.textContent = repos.length ? 'Repo: ' + repos.slice(-2).join(' · ') : 'Repo: none detected';
    b.title = items.map(x => x.type + ': ' + x.value).join('\n');
    b.style.opacity = repos.length ? '1' : '.5';
  }

  new MutationObserver(render).observe(document.documentElement, {childList:true, subtree:true});
  setInterval(render, 2000);
  render();
})();
