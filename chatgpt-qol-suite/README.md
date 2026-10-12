# ChatGPT QOL Suite (Manifest V3)

One Chromium extension containing 13 separately configurable modules. It replaces the need to load thirteen independent experimental extensions concurrently, while keeping all legacy folders in the repository unchanged for rollback and comparison.

**Project status:** v0.1 controlled integration. The GPT-5.6 guard was field-tested as a standalone extension; the consolidated version and the remaining twelve migrated features need live-browser acceptance. Only the guard is on by default. The other modules are experimental and **off by default**.

## Install

1. Download or check out this repository.
2. Open `chrome://extensions/`, enable **Developer mode**, and choose **Load unpacked**.
3. Select the `chatgpt-qol-suite` folder containing `manifest.json`.
4. Disable other `chatgpt-*` standalone extensions while testing the suite, particularly any standalone send guards, to prevent double interception.
5. Reload open ChatGPT tabs. Use the toolbar icon for quick Send Guard control, or **Open dashboard & settings** for every module and its options.

> Extensions loaded unpacked from a local folder must remain on disk. If downloading the ZIP, extract it first and select the nested `chatgpt-qol-suite` folder.

## Module registry

| Module | Function | Default |
|---|---|---|
| GPT-5.6 Send Guard | Rejects sends without a visible `5.6` model control; allows one-shot explicit override | **On** |
| Accidental Send Guard | Warns about structurally unfinished prompts | Off |
| Long-Prompt Warning | Character count, token estimate, configurable warning limit | Off |
| Model Cost Guard | Warns on brief prompts with visibly expensive settings | Off |
| Prompt Snapshotter | Stores long rolling drafts and permitted send attempts | Off |
| Pro Message Counter | Tracks *locally observed* confirmed Pro-labelled sends | Off |
| Model/Effort Ledger | Logs visible model and effort with timestamp at confirmed send | Off |
| Conversation Model History | Per-chat model/effort observations | Off |
| Repo Context Badge | Reports GitHub repository context from conversation messages | Off |
| Chat Project Index | Local chat-to-repository/task-ID index | Off |
| Branch/Issue Extractor | Copies issue, branch, task and SHA references | Off |
| Copy for Codex | Copies selected content or latest assistant response | Off |
| Response Completion Watch | Notifies after observed generating → idle transition when unfocused | Off |

## How this differs from the prototypes

- **One strict composer adapter** in `shared/dom.js`: only verified prompt editors and explicit composer send controls qualify. Copy buttons, chat navigation, writing-block editors and message actions must never count as sends.
- **One synchronous send-check pipeline** in `content.js`: enabled safety modules return warnings, combined into one dialog. A one-shot override replays one synchronous click; it is *not* a time-window bypass.
- **Scoped lifecycles**: each module's listeners, polling timers, badges and action buttons belong to a scope. Disabling a module immediately disposes them. Module registration cannot install listeners.
- **Centralised local writes**: the service worker serializes browser-local send-event storage across ChatGPT tabs. It does not send telemetry externally.
- **One dashboard**: all modules can be searched, individually toggled, and configured. Settings use `chrome.storage.sync`, records use `chrome.storage.local`. Popup offers quick access to Send Guard.
- **Strict defaults**: only the Send Guard is enabled at first install. Additional safeguards must be opted into, because heuristic false positives are possible.

## Migration and rollback

1. Keep existing standalone extension folders and their source unmodified until acceptance.
2. Install the suite side-by-side **but disable the matching standalone extensions** before trialling the same functionality.
3. Verify Send Guard with ChatGPT showing a model selector without `5.6`, then select `5.6` and confirm normal sends. Exercise copy code, conversation navigation, writing-block editing, Enter, Shift+Enter, and **Send anyway once** (including the *next* attempt).
4. Enable one experimental feature at a time via dashboard; use the dashboard's local-data export and tests.
5. Roll back by disabling this extension and re-enabling the original standalone extension(s).

**Historical data does not migrate automatically.** Chrome isolates storage between different extension IDs. Existing standalone extension records remain attached to the original installations. Export them with their original extension if needed **before uninstalling it**. The suite's settings import is for the suite's own settings format, not an automatic legacy importer.

## Local data and estimates

Counters, histories, and effort classifications record *visible, browser-observed behaviour*, not an authoritative OpenAI quota, billing meter, or server-side model identity. A visually ambiguous model control is classified as unknown. Sends made in another browser/profile/device are invisible here.

Snapshotter stores prompt text in this browser's `chrome.storage.local` only when enabled. The other usage modules record timestamps, model labels, and message length; histories and indexes can be exported and cleared in the dashboard. Settings can be synced using Chrome's account sync, but local records are not synced. No network, host permissions or `eval` are required beyond the ChatGPT content-script match patterns.

## Source layout

```
chatgpt-qol-suite/
├── manifest.json
├── background.js                # notifications, cross-tab serial record writes
├── assets/icon128.png
├── content.js                   # lifecycle, one send interceptor, one dialog
├── shared/
│   ├── core.js                 # module registry, defaults, local data helpers
│   ├── dom.js                  # strict composer + model control adapter
│   └── refs.js                 # bounded conversation-only reference analysis
├── modules/                     # 13 independent module definitions
├── ui/
│   ├── popup.html / popup.js
│   └── dashboard.html / dashboard.css / dashboard.js
└── tests/
    ├── fixture.html
    └── test_suite.py
```

## Run tests

```bash
python -m pip install playwright
python -m playwright install chromium
python tests/test_suite.py
```

The suite test covers the Send Guard's v0.3 regressions, single-use override, unrelated copy and navigation controls, writer blocks, stacked warnings, live enable/disable lifecycle, send-observation records, and dashboard behaviour.

GitHub Actions runs syntax/static checks and browser tests on pull requests and relevant pushes.

## Boundaries and known limitations

- ChatGPT's internal DOM is not a supported API and can change. In unknown layouts, the Send Guard cannot guarantee blocking sends it cannot identify; it fails closed **for identifiable sends** whose model control is unrecognized. Requalification is needed after major ChatGPT UI changes.
- Browser-observed user-message DOM confirmation is heuristic: rerenders, changes in ChatGPT markup, and multi-device sends can affect local metrics. Do not use the records as financial or usage reconciliation.
- Some prototypes' badges have been intentionally replaced by a shared unobtrusive badges/action strip. Exact UI parity is not a migration acceptance requirement.
- Enabling many experimental modules increases polling and DOM analysis. Test one at a time until live qualification is established.
