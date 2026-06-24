## 1. Create vimium.js — script skeleton and mode state

- [x] 1.1 Create `src-tauri/src/vimium.js` with IIFE wrapper and `window.__vimiumInstalled` guard
- [x] 1.2 Define mode variable (`'normal' | 'hint' | 'insert'`) and Insert mode detection via `focusin`/`focusout` listeners
- [x] 1.3 Add `keydown` listener with `useCapture: true`; stub out Normal / Hint / Insert branches

## 2. Implement scroll commands

- [x] 2.1 Implement `isScrollable(el)` using `computedStyle.overflow/overflowY` and `scrollHeight > clientHeight + 1`
- [x] 2.2 Implement `findScrollable()`: walk up from `document.activeElement`, then from `elementFromPoint(center)`, fallback to `document.scrollingElement`
- [x] 2.3 Wire `j`/`k` (80px), `d`/`u` (half-page), `G` (bottom) in the Normal mode keydown handler
- [x] 2.4 Implement `gg` double-key with 1-second timer; wire to `scrollTo(0, 0)`
- [x] 2.5 Wire `H`/`L` (`history.back()`/`history.forward()`) and `r` (`location.reload()`)

## 3. Implement hint mode

- [x] 3.1 Implement `generateLabels(count)` using `sadfjklewcmpgh`; single chars first, then two-char pairs
- [x] 3.2 Implement `getClickables()`: query `a[href], button, input, select, [role=button], [role=link], [onclick]`, filter by visible viewport bounds
- [x] 3.3 Implement `enterHintMode()`: create a `position:fixed; z-index:2147483647` container on `document.documentElement`, create one `<div>` per clickable with yellow label
- [x] 3.4 Implement `updateHints(typed)`: hide non-matching hints, dim typed prefix in matching hints, trigger activation when exactly one match remains
- [x] 3.5 Implement `activateElement(el)`: dispatch `mousedown → mouseup → click` MouseEvents with `bubbles:true`
- [x] 3.6 Implement `exitHintMode()`: remove hint container, reset state, set mode to `'normal'`
- [x] 3.7 Add `scroll` event listener (capture, passive) that calls `exitHintMode()` when in hint mode
- [x] 3.8 Wire `f` key in Normal mode keydown handler to call `enterHintMode()`
- [x] 3.9 Handle `Escape` and `Backspace` in Hint mode keydown branch

## 4. Inject script from Rust

- [x] 4.1 In `src-tauri/src/lib.rs`, inside the `on_page_load` callback after the existing SPA monitor `wv.eval()`, add `wv.eval(include_str!("vimium.js")).ok()`
- [x] 4.2 Verify the app compiles (`cargo build`) with no errors

## 5. Manual verification

- [x] 5.1 Open browser pane on a content-heavy page (e.g., Wikipedia) and confirm `j`/`k`/`d`/`u`/`gg`/`G` scroll correctly
- [x] 5.2 Confirm `H`/`L` navigate history and `r` reloads
- [x] 5.3 Press `f` and confirm yellow hint labels appear on all visible links
- [x] 5.4 Type a single-char hint and confirm the link is activated
- [x] 5.5 Type the first char of a two-char hint and confirm non-matching hints disappear
- [x] 5.6 Press `Escape` in hint mode and confirm labels are removed
- [x] 5.7 Click into a text input, confirm Vimium keys are suppressed, press `Escape` to return to Normal mode
- [x] 5.8 Test on a SPA (e.g., GitHub) and confirm key bindings work after client-side navigation
