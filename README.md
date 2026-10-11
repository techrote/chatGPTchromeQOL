# chatGPTchromeQOL

Small, independent Chrome/Chromium extensions for the way this repository's owner uses ChatGPT: model/effort control, long technical prompts, coding-agent handoffs, GitHub project context and local usage accounting.

Each folder is a separately loadable Manifest V3 extension. The prototypes deliberately avoid pretending that browser-local observations are authoritative server-side quota or billing data.

## Current extensions

| Folder | Purpose | State |
|---|---|---|
| `chatgpt-56-send-guard` | Blocks sends unless `5.6` is visibly present; one-shot override | **Tested / working v0.2** |
| `chatgpt-pro-message-counter` | Local Pro-send counter with today/7-day figures | Prototype |
| `chatgpt-model-effort-ledger` | Timestamped local model/effort/send ledger + JSON export | Prototype |
| `chatgpt-model-cost-guard` | Warns on short prompts using visibly heavy settings | Prototype |
| `chatgpt-conversation-model-history` | Per-chat timeline of visible model/effort settings | Prototype |
| `chatgpt-prompt-snapshotter` | Rolling long-prompt draft backup + send-attempt snapshots | Prototype |
| `chatgpt-repo-context-badge` | Detects GitHub repo/issue/PR context in the current thread | Prototype |
| `chatgpt-long-prompt-warning` | Live character/token estimate + large-prompt warning | Prototype |
| `chatgpt-accidental-send-guard` | Warns on structurally unfinished-looking prompts | Prototype |
| `chatgpt-chat-project-index` | Local chat -> repo/task-ID index + JSON export | Prototype |
| `chatgpt-response-completion-watch` | Desktop notification when background response generation finishes | Prototype |
| `chatgpt-branch-issue-extractor` | Extracts task IDs, issue refs, branches and commit SHAs | Prototype |
| `chatgpt-copy-for-codex` | Copies selected text or latest assistant response for agent handoff | Prototype |

## Install a prototype

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the individual extension folder.
5. Reload the ChatGPT tab.

## Prototype caveats

These are intentionally small experiments built against the current ChatGPT web UI. DOM selectors and product labels can change.

Several prototypes add fixed diagnostic badges. Loading every prototype at once is useful for integration testing, but visually noisy. They use different vertical offsets so that the badges remain individually inspectable.

The accounting extensions store data only in `chrome.storage.local`. They therefore count only activity observed by that installed browser profile and should not be interpreted as authoritative OpenAI account quota.

The next useful hardening pass would consolidate shared ChatGPT DOM detection into a common tested pattern, add options pages, replace browser `confirm()` dialogs with consistent in-page modals, and build a combined dashboard extension once the individual experiments reveal which signals are reliable.
