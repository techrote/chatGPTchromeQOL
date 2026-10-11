# ChatGPT Model Cost Guard — prototype

A deliberately simple heuristic guard for expensive-looking settings.

It currently warns when:

- the visible composer controls contain **Pro** or **Extra High**, and
- the prompt is under 800 characters **or** under 60 words.

The warning is advisory: **OK** permits that send and **Cancel** blocks it.

This is not a semantic complexity classifier and the thresholds are expected to be tuned after real use. It is intended to catch obvious “why am I spending Pro/Extra High on this?” cases.
