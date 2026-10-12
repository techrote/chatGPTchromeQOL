/* Shared registry and settings schema. No module may install global listeners at registration. */
(() => {
  'use strict';
  const Q = globalThis.ChatQOL = globalThis.ChatQOL || {};
  const modules = Q.modules = Q.modules || [];
  Q.register = (definition) => {
    if (!definition.id || modules.some(m => m.id === definition.id)) throw new Error('Duplicate module id: ' + definition.id);
    modules.push(definition);
  };
  Q.configKey = 'chatqol.settings.v1';
  Q.defaults = {
    enabled: {
      'send-guard': true,
      'accidental-send': false,
      'long-prompt': false,
      'model-cost': false,
      'snapshotter': false,
      'pro-counter': false,
      'effort-ledger': false,
      'model-history': false,
      'repo-badge': false,
      'project-index': false,
      'ref-extractor': false,
      'copy-for-codex': false,
      'response-watch': false
    },
    options: {
      'long-prompt': { chars: 12000, showBadge: true },
      'model-cost': { shortChars: 800 },
      'snapshotter': { draftChars: 500 },
      'repo-badge': { showBadge: true }
    }
  };
  Q.normalizeConfig = (value) => {
    const out = { enabled: { ...Q.defaults.enabled }, options: structuredClone(Q.defaults.options) };
    if (!value || typeof value !== 'object') return out;
    for (const id of Object.keys(out.enabled)) {
      if (typeof value.enabled?.[id] === 'boolean') out.enabled[id] = value.enabled[id];
    }
    for (const [id, def] of Object.entries(out.options)) {
      for (const [key, val] of Object.entries(def)) {
        const candidate = value.options?.[id]?.[key];
        if (typeof candidate === typeof val && (typeof val !== 'number' || Number.isFinite(candidate))) {
          out.options[id][key] = candidate;
        }
      }
    }
    return out;
  };
  Q.dataKeys = {
    snapshots: 'cgptPromptSnapshots', draft: 'cgptPromptRollingDraft',
    proCounter: 'cgptProCounterEvents', ledger: 'cgptModelEffortLedger',
    history: 'cgptConversationModelHistory', projects: 'cgptChatProjectIndex'
  };
  // All record mutations are serialized in the extension service worker, across tabs.
  Q.append = async (key, value, limit = 1000) => {
    const result = await chrome.runtime.sendMessage({ type: 'chatqol-append', key, value, limit });
    if (!result?.ok) throw new Error(result?.error || 'Local record append failed');
  };
  Q.updateProject = async (path, record) => {
    const result = await chrome.runtime.sendMessage({ type: 'chatqol-project-update', path, record });
    if (!result?.ok) throw new Error(result?.error || 'Project index write failed');
  };
  Q.localJsonDownload = (filename, data) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };
})();
