# ChatGPT Prompt Snapshotter — prototype

Local safety net for long prompts and agent handoffs.

- Debounced rolling draft backup begins at **500 characters**.
- A full snapshot is written immediately on a send attempt.
- Duplicate identical prompt/chat snapshots are suppressed.
- Keeps the latest **250** full snapshots.
- Click the badge to inspect recent snapshots or export all data as JSON.

Snapshots are intentionally taken on **send attempt**, not confirmed send, because preserving text is useful even if another extension blocks the submission.
