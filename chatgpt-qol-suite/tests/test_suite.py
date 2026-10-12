"""Offline Chromium integration tests for the modular extension; no ChatGPT network calls."""
from pathlib import Path
import json
import shutil
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CHROME = shutil.which('chromium') or shutil.which('google-chrome') or shutil.which('google-chrome-stable')
MANIFEST = json.loads((ROOT / 'manifest.json').read_text())
SCRIPTS = MANIFEST['content_scripts'][0]['js']

MOCK_CHROME = r"""
(() => {
  const stores = { sync: {}, local: {} };
  const listeners = [];
  const region = name => ({
    async get(keys) {
      const all = stores[name];
      if (keys == null) return {...all};
      if (typeof keys === 'string') keys = [keys];
      if (Array.isArray(keys)) return Object.fromEntries(keys.filter(k=>k in all).map(k=>[k,structuredClone(all[k])]));
      return Object.fromEntries(Object.entries(keys).map(([k,v])=>[k,structuredClone(all[k] ?? v)]));
    },
    async set(data) {
      const changes = {};
      for (const [key,val] of Object.entries(data)) {
        changes[key] = {oldValue: stores[name][key], newValue: structuredClone(val)};
        stores[name][key] = structuredClone(val);
      }
      for (const fn of listeners) fn(changes, name);
    },
    async remove(keys) {
      for (const key of keys) delete stores[name][key];
    }
  });
  globalThis.chrome = {
    storage: {sync:region('sync'),local:region('local'),onChanged:{addListener(fn){listeners.push(fn)}}},
    runtime: {
      async sendMessage(x){
        (globalThis.messages ||= []).push(x);
        if (x.type === 'chatqol-append') {
          const r = stores.local[x.key] || [];
          stores.local[x.key] = [...r,x.value].slice(-x.limit);
          return {ok:true};
        }
        if (x.type === 'chatqol-project-update') {
          (stores.local.cgptChatProjectIndex ||= {})[x.path] = x.record;
          return {ok:true};
        }
        return {ok:true};
      },
      getManifest(){return {version:'0.1.0'};},openOptionsPage(){globalThis.openedOptions=true}
    }
  };
  globalThis.mockStores = stores;
})();
"""


def assert_check(condition, description):
    if not condition:
        raise AssertionError(description)


def launch(p):
    opts = {"headless": True, "args": ["--no-sandbox"]}
    if CHROME:
        opts['executable_path'] = CHROME
    return p.chromium.launch(**opts)


def inject(page):
    page.evaluate(MOCK_CHROME)
    for path in SCRIPTS:
        page.add_script_tag(path=str(ROOT / path))


def test_composer(p):
    count = 0
    browser = launch(p)
    context = browser.new_context(viewport={'width':1100,'height':900})
    page = context.new_page()
    page.goto('about:blank')
    page.set_content((ROOT / 'tests' / 'fixture.html').read_text())
    inject(page)
    page.locator('#chatqol-root').wait_for(state='attached')
    badge = '#chatqol-root .badge[data-module="send-guard"]'
    modal = '#chatqol-root [role="dialog"]'
    assert_check(page.locator(badge).count() == 1, 'Default guard badge missing')
    count += 1
    for target, n in [('#copy','copy'),('#nav','nav'),('#nav2','nav2'),('#other-send','other')]:
        page.locator(target).click()
        assert_check(page.evaluate('counters.' + n) == 1, 'Blocked unrelated UI: ' + n)
        assert_check(page.locator(modal).count() == 0, 'Unrelated click warned: ' + n)
        count += 1
    page.locator('#writing-editor').focus()
    page.keyboard.press('Enter')
    assert_check(page.locator(modal).count() == 0, 'Unrelated contenteditable Enter was guarded')
    count += 1
    page.locator('#prompt-textarea').fill('5.6 is mentioned in the prompt')
    page.locator('#send').dispatch_event('pointerdown')
    assert_check(page.locator(modal).count() == 1, 'Pointerdown did not block wrong model')
    assert_check(page.evaluate('counters.pointerSend') == 0, 'Wrong-model pointerdown reached app')
    count += 2
    page.get_by_role('button',name='Cancel').click()
    page.locator('#send').dispatch_event('click')
    assert_check(page.locator(modal).count() == 1, 'Click did not warn')
    assert_check(page.evaluate('counters.clickSend') == 0, 'Wrong-model click reached app')
    count += 2
    page.get_by_role('button',name='Send anyway once').click()
    assert_check(page.evaluate('counters.clickSend') == 1, 'Override click not exactly once')
    assert_check(page.evaluate('counters.submit') == 1, 'Override submit not exactly once')
    count += 2
    page.locator('#send').dispatch_event('click')
    assert_check(page.locator(modal).count() == 1 and page.evaluate('counters.clickSend') == 1,
                 'Override leaked to next send')
    count += 1
    page.get_by_role('button',name='Cancel').click()
    page.locator('#prompt-textarea').focus()
    page.keyboard.press('Enter')
    assert_check(page.locator(modal).count() == 1 and page.evaluate('counters.enter') == 0,'Composer Enter not guarded')
    count += 1
    page.get_by_role('button',name='Cancel').click()
    page.locator('#prompt-textarea').focus()
    page.keyboard.press('Shift+Enter')
    assert_check(page.locator(modal).count() == 0, 'Shift+Enter blocked')
    count += 1
    page.locator('#model').evaluate('(b) => b.textContent = "5.6 Extra High"')
    page.locator('#send').dispatch_event('click')
    assert_check(page.locator(modal).count() == 0 and page.evaluate('counters.clickSend') == 2,
                 'Valid GPT-5.6 did not allow send')
    count += 1
    page.locator('#model').evaluate('(b) => b.textContent = "Extra High"')
    page.evaluate("""async () => {
      const s = ChatQOL.normalizeConfig((await chrome.storage.sync.get('chatqol.settings.v1'))['chatqol.settings.v1']);
      s.enabled['send-guard'] = false;
      await chrome.storage.sync.set({'chatqol.settings.v1': s});
    }""")
    assert_check(page.locator(badge).count() == 0, 'Disabled guard kept its badge')
    page.locator('#send').dispatch_event('click')
    assert_check(page.locator(modal).count() == 0 and page.evaluate('counters.clickSend') == 3,
                 'Disabled guard still blocks')
    count += 2
    # Enable two guards: they must share ONE dialog and a one-shot exception.
    page.evaluate("""async () => {
      const s = ChatQOL.normalizeConfig((await chrome.storage.sync.get('chatqol.settings.v1'))['chatqol.settings.v1']);
      s.enabled['send-guard'] = true;
      s.enabled['accidental-send'] = true;
      s.enabled['long-prompt'] = true;
      s.options['long-prompt'].chars = 200;
      await chrome.storage.sync.set({'chatqol.settings.v1': s});
    }""")
    page.locator('#prompt-textarea').fill('A' * 250 + ':')
    page.locator('#send').dispatch_event('click')
    assert_check(page.locator(modal).count() == 1, 'Multiple checks created multiple dialogs')
    assert_check('Review before sending' in page.locator(modal).inner_text(), 'Combined guard title missing')
    count += 2
    page.get_by_role('button',name='Cancel').click()
    page.get_by_role('button',name='Send anyway once').count() == 0
    # No composer: writing block/navigation must still work.
    page.locator('#chat-form').evaluate('(el) => el.remove()')
    page.locator('#copy').click()
    page.locator('#nav').click()
    assert_check(page.evaluate('counters.copy') == 2 and page.evaluate('counters.nav') == 2,
                 'Controls blocked after composer removal')
    count += 1
    context.close(); browser.close()
    return count


def test_reporting(p):
    count = 0
    browser = launch(p)
    context = browser.new_context(viewport={'width':1100,'height':900})
    page = context.new_page(); page.goto('about:blank')
    page.set_content((ROOT / 'tests' / 'fixture.html').read_text())
    inject(page)
    page.evaluate("""async () => {
      const s = ChatQOL.normalizeConfig((await chrome.storage.sync.get('chatqol.settings.v1'))['chatqol.settings.v1']);
      for (const id of ['snapshotter','effort-ledger','model-history','pro-counter','ref-extractor','copy-for-codex','repo-badge','project-index']) s.enabled[id] = true;
      await chrome.storage.sync.set({'chatqol.settings.v1': s});
    }""")
    # Enabling multiple modules must not create 8 independent event interceptors.
    page.locator('#prompt-textarea').fill('Hello confirmed send')
    page.locator('#send').dispatch_event('click')
    assert_check(page.locator('#chatqol-root [role="dialog"]').count() == 1, 'Guard not active')
    page.get_by_role('button',name='Send anyway once').click()
    page.evaluate("""() => {
      const n = document.createElement('div'); n.setAttribute('data-message-author-role','user');
      n.textContent = 'Hello confirmed send'; document.querySelector('main').append(n);
    }""")
    page.wait_for_function("""async () => {
      const db = await chrome.storage.local.get(['cgptModelEffortLedger','cgptProCounterEvents','cgptPromptSnapshots','cgptConversationModelHistory']);
      return ['cgptModelEffortLedger','cgptProCounterEvents','cgptPromptSnapshots','cgptConversationModelHistory'].every(k => db[k]?.length === 1);
    }""")
    count += 4
    # A blocked attempt must not count in the ledger/snapshots.
    page.locator('#send').dispatch_event('click')
    page.get_by_role('button',name='Cancel').click()
    page.wait_for_timeout(70)
    assert_check(page.evaluate("mockStores.local.cgptModelEffortLedger.length") == 1,'Blocked attempt counted')
    count += 1
    # Disable all observers, verify no accumulation.
    page.evaluate("""async () => {
      const s = ChatQOL.normalizeConfig((await chrome.storage.sync.get('chatqol.settings.v1'))['chatqol.settings.v1']);
      for (const id of Object.keys(s.enabled)) s.enabled[id] = false;
      await chrome.storage.sync.set({'chatqol.settings.v1': s});
    }""")
    assert_check(page.evaluate("ChatQOL.runtime.status().length") == 0,'Disabled modules remain live')
    assert_check(page.locator('#chatqol-root .badge').count() == 0 and page.locator('#chatqol-root .actions button').count() == 0,
                 'Disabled modules left injected UI')
    count += 2
    page.locator('#send').dispatch_event('click')
    page.evaluate("""() => { const n = document.createElement('div');n.setAttribute('data-message-author-role','user');n.textContent='Another send';document.querySelector('main').append(n); }""")
    page.wait_for_timeout(80)
    assert_check(page.evaluate("mockStores.local.cgptModelEffortLedger.length") == 1,'Disabled observer recorded send')
    count += 1
    context.close();browser.close()
    return count


def test_dashboard(p):
    browser = launch(p)
    context = browser.new_context(viewport={'width':1350,'height':1000})
    page = context.new_page()
    page.goto('about:blank')
    html = (ROOT / 'ui' / 'dashboard.html').read_text()
    html = re.sub(r'<script[^>]+src=[^>]+></script>', '', html)
    page.set_content(html)
    page.add_style_tag(path=str(ROOT / 'ui' / 'dashboard.css'))
    page.evaluate(MOCK_CHROME)
    page.add_script_tag(path=str(ROOT / 'shared' / 'core.js'))
    for module_file in (ROOT / 'modules').glob('*.js'):
        page.add_script_tag(path=str(module_file))
    page.add_script_tag(path=str(ROOT / 'ui' / 'dashboard.js'))
    page.locator('.module').first.wait_for()
    assert_check(page.locator('.module').count() == 13,'Dashboard did not register all 13 modules')
    assert_check(page.locator('#enabled-count').inner_text() == '1','Defaults not reflected')
    assert_check(page.locator('.module[data-id="send-guard"] input[type="checkbox"]').is_checked(), 'Guard default off')
    page.locator('#search').fill('Model Cost')
    assert_check(page.locator('.module').count() == 1, 'Search filter broken')
    page.locator('#search').fill('')
    page.locator('.module[data-id="accidental-send"] input[type="checkbox"]').check()
    page.wait_for_function("() => mockStores.sync['chatqol.settings.v1']?.enabled['accidental-send'] === true")
    page.locator('.module[data-id="long-prompt"] .settings-toggle').click()
    assert_check(page.locator('#opt-long-prompt-chars').is_visible(), 'Module options do not expand')
    page.locator('#opt-long-prompt-chars').fill('3000');page.locator('#opt-long-prompt-chars').dispatch_event('change')
    page.wait_for_function("() => mockStores.sync['chatqol.settings.v1']?.options['long-prompt'].chars === 3000")
    count = 7
    context.close();browser.close()
    return count


if __name__ == '__main__':
    with sync_playwright() as p:
        n = test_composer(p) + test_reporting(p) + test_dashboard(p)
        print(f'PASS: {n} Chromium integration assertions')
