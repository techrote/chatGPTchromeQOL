# ChatGPT Accidental Send Guard — prototype

Warns before a send when the current prompt has simple structural signs of being unfinished.

Prototype checks:

- odd number of triple-backtick fences
- trailing `:`, `;` or `,`
- trailing opening bracket/brace/parenthesis
- trailing linking words such as `and`, `because`, `with` or `to`
- trailing backslash

This should be tuned against false positives. It intentionally does not attempt semantic “AI detection” of whether a thought is complete.
