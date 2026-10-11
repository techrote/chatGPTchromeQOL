(() => {
  'use strict';
  const KEY = 'cgptChatProjectIndex';
  const ID = 'cgpt-chat-project-index';

  function scan() {
    const text = document.body?.innerText || '';
    const repos = new Set();
    const ids = new Set();

    for (const a of document.querySelectorAll('a[href*="github.com/"]')) {
      try {
        const u = new URL(a.href);
        const p = u.pathname.split('/').filter(Boolean);
        if (p.length >= 2) repos.add(p[0] + '/' + p[1].replace(/\.git$/, ''));
      } catch {}
    }

    const urlRe = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/g;
    let m;
    while ((m = urlRe.exec(text))) repos.add(m[1] + '/' + m[2].replace(/\.git$/, ''));

    const idRe = /\b[A-Z][A-Z0-9]{1,9}-\d{1,4}[A-Z0-9-]*\b/g;
    while ((m = idRe.exec(text))) ids.add(m[0]);

    return { repos: [...repos].slice(-30), ids: [...ids].slice(-100) };
  }

  async function persist() {
    const data = scan();
    if (!data.repos.length && !data.ids.length) return render(data);
    const got = await chrome.storage.local.get(KEY);
    const db = got[KEY] && typeof got[KEY] === 'object' ? got[KEY] : {};
    db[location.pathname] = {
      chat: location.href,
      title: document.title,
      updatedAt: Date.now(),
      repos: data.repos,
      ids: data.ids
    };
    await chrome.storage.local.set({ [KEY]: db });
    render(data);
  }

  function render(data = scan()) {
    let b = document.getElementById(ID);
    if (!b) {
      b = document.createElement('button');
      b.id = ID;
      b.style.cssText = 'position:fixed;right:14px;bottom:388px;z-index:2147483592;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;cursor:pointer';
      b.onclick = showIndex;
      document.documentElement.appendChild(b);
    }
    b.textContent = 'Project index: ' + data.repos.length + ' repo · ' + data.ids.length + ' IDs';
  }

  async function showIndex() {
    const got = await chrome.storage.local.get(KEY);
    const db = got[KEY] && typeof got[KEY] === 'object' ? got[KEY] : {};
    const rows = Object.values(db).sort((a,b) => b.updatedAt - a.updatedAt);
    const preview = rows.slice(0, 20).map(r =>
      new Date(r.updatedAt).toLocaleDateString() + ' — ' +
      (r.repos.join(', ') || 'no repo') + ' — ' +
      (r.ids.slice(0,6).join(', ') || 'no task IDs')
    ).join('\n');
    if (confirm('Indexed chats: ' + rows.length + '\n\n' + (preview || 'No project chats indexed yet.') + '\n\nOK = download index JSON')) {
      const blob = new Blob([JSON.stringify(db, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chatgpt-project-index.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  }

  let timer = 0;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(persist, 1200);
  }).observe(document.documentElement, {childList:true, subtree:true});
  addEventListener('popstate', persist);
  setInterval(persist, 5000);
  persist();
})();
