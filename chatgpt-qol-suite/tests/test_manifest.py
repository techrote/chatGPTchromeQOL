"""Offline static package consistency checks. No external dependencies."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert set(manifest['permissions']) == {'storage', 'notifications'}
assert not manifest['host_permissions']
content_scripts = manifest['content_scripts']
assert len(content_scripts) == 1
assert content_scripts[0]['run_at'] == 'document_start'
assert content_scripts[0]['matches'] == ['https://chatgpt.com/*', 'https://chat.openai.com/*']
js = content_scripts[0]['js']
assert len(js) == len(set(js))
assert js[0] == 'shared/core.js'
assert js[1] == 'shared/dom.js'
assert js[2] == 'shared/refs.js'
assert js[-1] == 'content.js'
assert len([p for p in js if p.startswith('modules/')]) == 13
for path in js:
    assert (ROOT / path).is_file(), f'Missing content file: {path}'
for key in ['background.service_worker', 'action.default_popup', 'options_page']:
    obj = manifest
    for member in key.split('.'):
        obj = obj[member]
    assert (ROOT / obj).is_file(), f'Missing manifest asset: {key} {obj}'
assert (ROOT / 'assets/icon128.png').is_file()
print('PASS: MV3 manifest, 13 modules, local assets, minimal permissions')
