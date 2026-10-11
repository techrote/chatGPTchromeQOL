# ChatGPT Long Prompt Warning — prototype

Shows a live composer size estimate and warns before sending a very large prompt.

Current defaults:

- warning threshold: **12,000 characters**
- rough token estimate: **characters / 4**

The token estimate is intentionally approximate; the useful signal here is prompt growth, not tokenizer-grade accounting.

Edit `WARN_CHARS` in `content.js` to tune the threshold.
