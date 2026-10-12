(async () => {
  const Q = globalThis.ChatQOL;
  const key = Q.configKey;
  let config = Q.normalizeConfig((await chrome.storage.sync.get(key))[key]);
  const box = document.getElementById('guard');
  function draw() {
    box.checked = config.enabled['send-guard'];
    document.getElementById('count').textContent = `${Object.values(config.enabled).filter(Boolean).length} of 13 enabled`;
  }
  draw();
  box.addEventListener('change', async () => {
    config.enabled['send-guard'] = box.checked;
    await chrome.storage.sync.set({ [key]: config });
    draw();
  });
  document.getElementById('open').addEventListener('click', () => chrome.runtime.openOptionsPage());
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[key]) { config = Q.normalizeConfig(changes[key].newValue); draw(); }
  });
})();
