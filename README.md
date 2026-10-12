# chatGPTchromeQOL

Small Chrome/Chromium extensions for ChatGPT workflows, including model/effort control, technical prompts, coding-agent handoffs, GitHub project context and local usage accounting.

## Recommended installation: ChatGPT QOL Suite

The new [modular suite](chatgpt-qol-suite/README.md) provides **one Manifest V3 extension with 13 independently togglable features, a dashboard, one send-interception pipeline, live module lifecycle management, serialized cross-tab writes, and browser regression tests**.

**Install:** Open `chrome://extensions/`, enable Developer mode, choose **Load unpacked**, and select `chatgpt-qol-suite`. The popup provides a quick Send Guard toggle; the full options page manages all modules and local records.

The previously field-tested GPT-5.6 Send Guard is the **only default-enabled module**. The other twelve migrated prototypes are opt-in and still require live acceptance. Disable corresponding standalone extensions during suite testing to avoid duplicate interception. See the [migration and rollback procedure](chatgpt-qol-suite/README.md#migration-and-rollback).

## Retained standalone extensions

Legacy prototypes are intentionally preserved as independent, separately loadable Manifest V3 extensions for rollback and comparison. Their DOM selectors and UI may be less reliable than the consolidated suite. The modules in the suite have been reimplemented against shared infrastructure, not concatenated.

| Folder | Purpose | Historical state |
|---|---|---|
| `chatgpt-56-send-guard` | Blocks sends unless `5.6` visibly selected; one-shot override | Field-tested standalone |
| `chatgpt-pro-message-counter` | Local observed Pro-send counter | Prototype |
| `chatgpt-model-effort-ledger` | Timestamped model/effort ledger + JSON export | Prototype |
| `chatgpt-model-cost-guard` | Warns on short prompts with heavy visible settings | Prototype |
| `chatgpt-conversation-model-history` | Per-chat model/effort timeline | Prototype |
| `chatgpt-prompt-snapshotter` | Rolling draft backup + send-attempt snapshots | Prototype |
| `chatgpt-repo-context-badge` | Detects repo/issue/PR context in current thread | Prototype |
| `chatgpt-long-prompt-warning` | Character/token estimate and prompt-size guard | Prototype |
| `chatgpt-accidental-send-guard` | Detects unfinished-looking prompts | Prototype |
| `chatgpt-chat-project-index` | Local chat → repo/task-ID index + export | Prototype |
| `chatgpt-response-completion-watch` | Notification after observed response completion | Prototype |
| `chatgpt-branch-issue-extractor` | Extracts task IDs, issues, branches, commit hashes | Prototype |
| `chatgpt-copy-for-codex` | Copies selection or latest assistant response | Prototype |

## Qualification, privacy, and limitations

The suite has automated Chromium UI regression coverage and modular configuration tests. It is not yet equivalent to qualification against live ChatGPT across all thirteen features. ChatGPT UI changes may require adapter updates.

Records reside in this browser's extension-local storage. Observed model/effort labels and message counts are not OpenAI account quota/billing data. Historical data in old extensions cannot automatically be accessed by the suite due to Chrome's extension storage isolation.

```bash
python chatgpt-qol-suite/tests/test_manifest.py
python chatgpt-qol-suite/tests/test_suite.py
```
