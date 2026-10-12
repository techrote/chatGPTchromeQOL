(() => {
  'use strict';
  const Q = globalThis.ChatQOL;
  const $ = (s) => document.querySelector(s);
  const groups = ['Sending & safety', 'Usage & monitoring', 'Development workflow'];
  let config = Q.normalizeConfig();
  let dirty = false;
  let saving = Promise.resolve();
  let currentSearch = '';
  let currentFilter = 'all';
  const moduleById = new Map(Q.modules.map(m => [m.id, m]));

  function state(message) { $('#save-state').textContent = message; }
  function enabledCount() {
    const n = Object.values(config.enabled).filter(Boolean).length;
    $('#enabled-count').textContent = n;
    $('#diag-enabled').textContent = `${n} / ${Q.modules.length}`;
  }
  function save() {
    dirty = true;
    state('Saving…');
    const snapshot = Q.normalizeConfig(config);
    saving = saving.catch(() => {}).then(async () => {
      await chrome.storage.sync.set({ [Q.configKey]: snapshot });
      dirty = false;
      state('Saved');
    }).catch(err => state('Storage error: ' + String(err.message || err)));
    return saving;
  }
  function make(tag, cls, text) {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function createSwitch(value, onChange, accessibleName) {
    const label = make('label', 'switch');
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = value;
    input.setAttribute('aria-label', accessibleName);
    input.addEventListener('change', () => onChange(input.checked));
    label.append(input, make('span', 'track'));
    return label;
  }
  function fieldInput(module, field) {
    const row = make('div', 'field-row');
    const id = 'opt-' + module.id + '-' + field.key;
    const label = make('label', null, field.label); label.htmlFor = id;
    let input;
    if (field.type === 'checkbox') {
      input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!config.options[module.id]?.[field.key];
      input.addEventListener('change', () => {
        config.options[module.id][field.key] = input.checked;
        save();
      });
    } else {
      input = document.createElement('input'); input.type = 'number';
      input.min = field.min; input.max = field.max; input.step = '1';
      input.value = config.options[module.id]?.[field.key] ?? '';
      input.addEventListener('change', () => {
        const v = Number(input.value);
        if (!Number.isFinite(v)) return;
        config.options[module.id][field.key] = Math.max(field.min, Math.min(field.max, Math.round(v)));
        input.value = config.options[module.id][field.key];
        save();
      });
    }
    input.id = id; row.append(label, input); return row;
  }
  function moduleCard(module) {
    const enabled = config.enabled[module.id];
    const card = make('article', 'module' + (enabled ? ' active' : ''));
    card.dataset.id = module.id;
    const top = make('div', 'module-head');
    top.append(make('div', 'module-title', module.name));
    top.append(createSwitch(enabled, value => {
      config.enabled[module.id] = value;
      card.classList.toggle('active', value);
      save(); enabledCount();
      if (currentFilter !== 'all') render();
    }, 'Enable ' + module.name));
    card.append(top, make('div', 'module-desc', module.description));
    const footer = make('div', 'module-footer');
    footer.append(make('span', 'stage', module.stage || 'experimental'));
    if (module.fields?.length) {
      const toggle = make('button', 'settings-toggle', 'Settings ▾');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      const advanced = make('div', 'module-settings'); advanced.hidden = true;
      for (const field of module.fields) advanced.append(fieldInput(module, field));
      toggle.addEventListener('click', () => {
        advanced.hidden = !advanced.hidden;
        toggle.setAttribute('aria-expanded', String(!advanced.hidden));
      });
      footer.append(toggle); card.append(footer, advanced);
    } else card.append(footer);
    return card;
  }
  function render() {
    const target = $('#groups'); target.replaceChildren();
    for (const groupName of groups) {
      const modules = Q.modules.filter(m => m.group === groupName)
        .filter(m => currentFilter === 'all' || config.enabled[m.id] === (currentFilter === 'enabled'))
        .filter(m => (m.name + ' ' + m.description).toLowerCase().includes(currentSearch));
      if (!modules.length) continue;
      const section = make('section', 'group');
      const title = make('div', 'group-title'); title.append(make('h2', null, groupName), make('small', null, `${modules.length} modules`));
      const grid = make('div', 'module-grid');
      modules.forEach(m => grid.append(moduleCard(m)));
      section.append(title, grid); target.append(section);
    }
    if (!target.childElementCount) target.append(make('p', 'helper', 'No modules match these filters.'));
    enabledCount();
  }
  async function load() {
    try {
      const result = await chrome.storage.sync.get(Q.configKey);
      config = Q.normalizeConfig(result[Q.configKey]); render(); state('Saved');
    } catch (err) { render(); state('Storage error: ' + String(err)); }
  }
  $('#search').addEventListener('input', e => { currentSearch = e.target.value.toLowerCase(); render(); });
  $('#filter').addEventListener('change', e => { currentFilter = e.target.value; render(); });
  $('#all-off').addEventListener('click', () => {
    if (!confirm('Disable all modules, including GPT-5.6 Send Guard?')) return;
    for (const id of Object.keys(config.enabled)) config.enabled[id] = false;
    save(); render();
  });
  $('#export-config').addEventListener('click', () => Q.localJsonDownload('chatgpt-qol-settings.json', config));
  $('#import-config').addEventListener('click', () => $('#config-file').click());
  $('#config-file').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!json || typeof json !== 'object' || !json.enabled) throw Error('Not a QOL Suite settings file');
      config = Q.normalizeConfig(json);
      await save(); render(); $('#data-message').textContent = 'Settings imported.';
    } catch (err) { $('#data-message').textContent = 'Import failed: ' + String(err.message || err); }
    event.target.value = '';
  });
  $('#export-data').addEventListener('click', async () => {
    try {
      const values = await chrome.storage.local.get(Object.values(Q.dataKeys));
      Q.localJsonDownload('chatgpt-qol-local-data.json', { exportedAt: new Date().toISOString(), values });
      $('#data-message').textContent = 'Local data exported. No server involved.';
    } catch (err) { $('#data-message').textContent = 'Export failed: ' + String(err); }
  });
  $('#clear-data').addEventListener('click', async () => {
    if (!confirm('Permanently delete ALL local records, drafts and project indexes stored by this suite? Settings are kept.')) return;
    try {
      await chrome.storage.local.remove(Object.values(Q.dataKeys));
      $('#data-message').textContent = 'Suite local records cleared.';
    } catch (err) { $('#data-message').textContent = 'Clear failed: ' + String(err); }
  });
  // Updates from popup/other dashboard tabs are reflected automatically.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[Q.configKey] && !dirty) {
      config = Q.normalizeConfig(changes[Q.configKey].newValue); render();
    }
  });
  $('#version').textContent = chrome.runtime.getManifest?.().version || '0.1.0';
  load();
})();
