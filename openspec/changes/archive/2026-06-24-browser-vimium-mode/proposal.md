## Why

The browser pane requires mouse interaction for all navigation and link-clicking, which breaks keyboard-driven workflows. Adding Vimium-style key bindings lets users scroll, navigate history, and follow links entirely from the keyboard.

## What Changes

- New JavaScript layer injected into the browser overlay webview on every page load
- Implements Vimium-style modal key bindings: Normal, Hint, and Insert modes
- Scroll commands: `j`/`k` (line), `d`/`u` (half-page), `gg`/`G` (top/bottom)
- History commands: `H`/`L` (back/forward), `r` (reload)
- Link hints: `f` shows letter labels on all visible clickable elements; typing the label activates the element
- Keys are configurable via Settings (future — default bindings are hardcoded for now)

## Capabilities

### New Capabilities

- `browser-vimium-mode`: Keyboard-driven browsing layer injected into the browser overlay webview, providing modal key bindings for scroll, navigation, and link activation

### Modified Capabilities

- `browser-overlay`: Injection point in `on_page_load` callback is extended to also load the Vimium script (requirement: the overlay webview now executes a persistent keyboard handler on every page load)

## Impact

- `src-tauri/src/lib.rs`: Add `wv.eval(include_str!("vimium.js"))` inside the existing `on_page_load` callback
- `src-tauri/src/vimium.js`: New file — self-contained JavaScript implementing all key handling and hint-mode UI
- No new Tauri commands, no new IPC surface, no frontend (React) changes required
- No new dependencies
