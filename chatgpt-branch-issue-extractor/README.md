# ChatGPT Branch / Issue Extractor — prototype

Extracts and copies repository-workflow references from the current ChatGPT thread:

- programme/task IDs such as `SDVK-010`
- bare issue references such as `#135`
- branch-looking strings
- 7–40 character hexadecimal commit SHAs

Click the fixed badge to copy a grouped plain-text reference sheet.

The branch detector is intentionally conservative and will miss unconventional branch names until tuned.
