/* Shared bounded conversation analysis; never scans sidebar, unrelated controls, or the entire body. */
(() => {
  'use strict';
  const Q = globalThis.ChatQOL;
  function messages() { return [...document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"]')]; }
  function scan() {
    const nodes = messages();
    const joined = nodes.map(x => x.innerText || x.textContent || '').join('\n').slice(-400000);
    const repos = new Set();
    const ids = new Set(joined.match(/\b[A-Z][A-Z0-9]{1,9}-\d{1,4}[A-Z0-9-]*\b/g) || []);
    const branches = new Set(joined.match(/\b(?:prepass|feature|fix|feat|chore|release|sdvk|tm|fnr|pp)\/[A-Za-z0-9._/-]{2,80}\b/gi) || []);
    const issues = new Set((joined.match(/(?:^|[\s(])#\d{1,6}\b/gm) || []).map(s => s.trim()));
    const shas = new Set((joined.match(/\b[0-9a-f]{7,40}\b/gi) || []).filter(s => /[a-f]/i.test(s)));
    const u = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/g;
    let m;
    while ((m = u.exec(joined))) repos.add(m[1] + '/' + m[2].replace(/\.git$/, ''));
    for (const node of nodes) {
      for (const a of node.querySelectorAll('a[href*="github.com/"]')) {
        try {
          const url = new URL(a.href);
          if (url.hostname !== 'github.com') continue;
          const p = url.pathname.split('/').filter(Boolean);
          if (p.length >= 2) repos.add(p[0] + '/' + p[1].replace(/\.git$/, ''));
        } catch { /* ignore malformed links */ }
      }
    }
    return {
      repos: [...repos].slice(-30), ids: [...ids].slice(-120), issues: [...issues].slice(-120),
      branches: [...branches].slice(-120), shas: [...shas].slice(-120)
    };
  }
  Q.refs = { scan, messages };
})();
