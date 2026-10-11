(() => {
  'use strict';
  const ID = 'cgpt-branch-issue-extractor';

  function extract() {
    const text = document.body?.innerText || '';
    const uniq = re => [...new Set(text.match(re) || [])];

    const taskIds = uniq(/\b[A-Z][A-Z0-9]{1,9}-\d{1,4}[A-Z0-9-]*\b/g).slice(-120);
    const issues = uniq(/(^|[\s(])#\d{1,6}\b/g).map(x => x.trim()).slice(-120);
    const shas = uniq(/\b[0-9a-f]{7,40}\b/gi).filter(x => /[a-f]/i.test(x)).slice(-120);

    const branches = new Set();
    const branchRe = /\b(?:prepass|feature|fix|feat|chore|release|sdvk|tm|fnr|pp)\/[A-Za-z0-9._/-]{2,80}\b/gi;
    let m;
    while ((m = branchRe.exec(text))) branches.add(m[0]);

    document.querySelectorAll('code').forEach(c => {
      const v = (c.innerText || '').trim();
      if (/^[A-Za-z0-9._-]+\/[A-Za-z0-9._/-]+$/.test(v) && v.length < 100) branches.add(v);
    });

    return { taskIds, issues, branches:[...branches].slice(-120), shas };
  }

  function format(x) {
    return [
      'TASK IDS\n' + (x.taskIds.join('\n') || '(none)'),
      'ISSUES\n' + (x.issues.join('\n') || '(none)'),
      'BRANCHES\n' + (x.branches.join('\n') || '(none)'),
      'COMMITS\n' + (x.shas.join('\n') || '(none)')
    ].join('\n\n');
  }

  async function copy() {
    const out = format(extract());
    try {
      await navigator.clipboard.writeText(out);
      flash('Extracted refs copied');
    } catch {
      alert(out);
    }
  }

  function flash(s) {
    const b = document.getElementById(ID);
    if (!b) return;
    const old = b.textContent;
    b.textContent = s;
    setTimeout(() => b.textContent = old, 1200);
  }

  function render() {
    const x = extract();
    let b = document.getElementById(ID);
    if (!b) {
      b = document.createElement('button');
      b.id = ID;
      b.style.cssText = 'position:fixed;right:14px;bottom:420px;z-index:2147483591;padding:6px 9px;border:1px solid #555;border-radius:8px;background:#202020;color:#eee;font:12px system-ui;cursor:pointer';
      b.onclick = copy;
      document.documentElement.appendChild(b);
    }
    b.textContent = 'Refs: ' + x.taskIds.length + ' task · ' + x.issues.length + ' issue · ' + x.branches.length + ' branch · ' + x.shas.length + ' SHA';
    b.title = 'Click to copy extracted references';
  }

  let timer = 0;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(render, 900);
  }).observe(document.documentElement, {childList:true, subtree:true});
  setInterval(render, 4000);
  render();
})();
