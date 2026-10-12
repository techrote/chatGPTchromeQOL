/* Browser-local, serialized cross-tab writes. No external network calls. */
const APPEND_KEYS = new Set([
  'cgptPromptSnapshots', 'cgptProCounterEvents', 'cgptModelEffortLedger', 'cgptConversationModelHistory'
]);
const JOBS = new Map();
function enqueue(key, job) {
  const previous = JOBS.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(job);
  JOBS.set(key, next);
  next.finally(() => { if (JOBS.get(key) === next) JOBS.delete(key); }).catch(() => {});
  return next;
}
const allowedSender = sender => Boolean(sender.tab && /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(sender.tab.url || ''));
chrome.runtime.onMessage.addListener((req, sender, respond) => {
  if (!allowedSender(sender)) return false;
  if (req?.type === 'chatqol-append' && APPEND_KEYS.has(req.key)) {
    const key = req.key;
    const limit = Math.min(10000, Math.max(1, Number(req.limit) || 1000));
    if (!req.value || typeof req.value !== 'object' || JSON.stringify(req.value).length > 700000) {
      respond({ ok: false, error: 'Invalid or excessive record' }); return false;
    }
    enqueue(key, async () => {
      const got = await chrome.storage.local.get(key);
      const data = Array.isArray(got[key]) ? got[key] : [];
      data.push(req.value);
      await chrome.storage.local.set({ [key]: data.slice(-limit) });
    }).then(() => respond({ ok: true }), err => respond({ ok: false, error: String(err) }));
    return true;
  }
  if (req?.type === 'chatqol-project-update' && typeof req.path === 'string' && req.path.startsWith('/') && req.path.length < 300 && req.record && typeof req.record === 'object') {
    enqueue('cgptChatProjectIndex', async () => {
      const key = 'cgptChatProjectIndex';
      const got = await chrome.storage.local.get(key);
      const db = got[key] && typeof got[key] === 'object' && !Array.isArray(got[key]) ? got[key] : {};
      db[req.path] = req.record;
      const values = Object.entries(db).sort((a,b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0)).slice(0,1000);
      await chrome.storage.local.set({ [key]: Object.fromEntries(values) });
    }).then(() => respond({ ok: true }), err => respond({ ok: false, error: String(err) }));
    return true;
  }
  if (req?.type === 'chatqol-response-done') {
    chrome.notifications.create({
      type: 'basic', iconUrl: 'assets/icon128.png', title: 'ChatGPT response finished',
      message: String(req.title || 'ChatGPT').slice(0, 110)
    });
  }
  return false;
});
