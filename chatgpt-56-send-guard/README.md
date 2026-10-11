# ChatGPT 5.6 Send Guard v0.2

A small Chrome/Chromium Manifest V3 extension that blocks a ChatGPT send attempt unless the visible composer controls contain `5.6`.

## What changed in v0.2

The first version only captured `keydown` and `click`. The current ChatGPT composer can route submission through earlier pointer/form handling, so v0.2 guards the whole send path:

- `pointerdown`, `pointerup`, `mousedown`, `mouseup`, and `click`
- Enter-to-send at the `window` capture phase
- form `submit`
- composed event paths for nested/shadow-DOM targets
- all matching ChatGPT frames

When `5.6` is not visible, a red **Send Guard: 5.6 not visible** badge appears. This also provides an immediate check that the content script is loaded.

A blocked send opens an in-page modal. **Cancel** is focused by default. **Send anyway once** explicitly replays one send while temporarily bypassing the guard.

## Install / update

1. Extract the ZIP.
2. Open `chrome://extensions/`.
3. Enable **Developer mode**.
4. If v0.1 is already installed, remove it or point the existing unpacked extension at this new folder and click **Reload**.
5. Click **Load unpacked** and select the `chatgpt-56-send-guard` folder if needed.
6. Reload the ChatGPT tab.

## Expected check

- With a composer that visibly says `5.6 Extra High`: no red badge, sends work normally.
- With a composer that only says `Extra High`: the red badge should be visible before you type anything. A send attempt must be blocked by the warning modal.

If the red badge does not appear while `5.6` is absent, the content script itself is not loading; check the extension card in `chrome://extensions/` for an error.
