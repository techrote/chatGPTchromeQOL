# ChatGPT Pro Message Counter — prototype

Local-only send accounting. It captures the composer model/control text at send time, then waits for a new user message to actually appear before counting it, so a send blocked by another guard should not increment the counter.

## Prototype behavior

- Tracks confirmed sends in `chrome.storage.local`.
- Separately classifies visible `Pro`, `5.6`, and ambiguous `Extra High` states.
- Shows rolling **today** and **7-day** local Pro counts.
- Keeps the last 5,000 confirmed sends.
- Does **not** claim to know the server-side quota.

The model classifier is intentionally conservative. If the ChatGPT UI does not expose `Pro` visibly, the event remains ambiguous rather than being falsely counted as Pro.
