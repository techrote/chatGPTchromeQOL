# ChatGPT Copy for Codex — prototype

Adds a persistent **Copy for Codex** control.

Copy precedence:

1. If at least 20 characters are currently selected, copy the selection.
2. Otherwise copy the latest assistant response.

The clone used for copying removes buttons, SVG icons and button-role controls, then normalizes excessive blank lines. Code and ordinary rendered text remain in the copied output.

This is intentionally minimal; a later version could add “copy only fenced task”, Markdown reconstruction, repo metadata headers, or issue-comment formatting.
