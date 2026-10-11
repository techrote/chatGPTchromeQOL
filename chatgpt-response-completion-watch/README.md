# ChatGPT Response Completion Watch — prototype

Watches for ChatGPT's visible **stop-generating** control.

State transition:

`generating -> idle for 900 ms -> complete`

If the ChatGPT tab is hidden or unfocused when that transition completes, the extension asks its Manifest V3 service worker to create a desktop notification.

The fixed badge exposes whether the prototype currently thinks ChatGPT is generating.

## Known prototype limitation

This depends on ChatGPT's stop-button DOM semantics. If the product changes those selectors, the badge will remain `idle` during generation and the selector set needs updating.
