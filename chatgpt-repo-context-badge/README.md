# ChatGPT Repo Context Badge — prototype

Scans the current conversation for GitHub links and keeps a compact fixed badge showing the repository context currently visible in the thread.

It extracts:

- `owner/repo`
- GitHub issue links
- GitHub pull-request links

Click the badge for the detected context list.

This prototype is intentionally passive: it does not call GitHub or modify the conversation.
