## Why

App-level keyboard shortcuts (Alt+j/k/n/m, Ctrl+,, etc.) stop working whenever the browser overlay or a terminal pane has focus. The overlay is a separate native WebView2 process whose keydown events never reach the main app's listener; the terminal (xterm.js) stops propagation before events bubble to the document.

## What Changes

- Extend `bindings_js()` in `keybindings.rs` to inject app-level bindings as `window.__app_bindings` into the browser overlay
- Add `APP_KEY_MAP` in `vimium.js` that matches app-level keys and forwards them via `window.__TAURI__.event.emit("app-action", actionId)` (Tauri event, not invoke — the browser-overlay capability only grants `core:event:allow-emit`)
- Add `main_focus` Tauri command that gives OS keyboard focus to the main webview (`get_webview("main").set_focus()`), so focus_chat and terminal tab switching actually land keystrokes in the right place after an action fires from the overlay
- In `App.tsx`, replace inline action dispatch with a shared `dispatchAction()` helper; add a `listen("app-action", ...)` handler; switch `keydown` listener to capture phase so xterm.js cannot block it; add `stopPropagation` on match
- Fix async cleanup race with React StrictMode: use an `active` flag so the `listen()` unlisten function is called immediately if cleanup runs before the promise resolves

## Capabilities

### New Capabilities

- (none — this is a bug fix, not a new user-visible capability)

### Modified Capabilities

- `app-shell`: App-level shortcuts must work regardless of which pane (browser overlay, terminal, editor) currently has OS or DOM focus
- `browser-vimium-mode`: The vimium script must intercept app-level shortcut keys in Normal mode and forward them to the main window via Tauri event emission

## Impact

- `src-tauri/src/commands/keybindings.rs`: Extend `bindings_js()` to include app-context bindings in `window.__app_bindings`
- `src-tauri/src/vimium.js`: Build `APP_KEY_MAP` from `window.__app_bindings`; emit `"app-action"` Tauri event on match in Normal mode
- `src-tauri/src/commands/browser.rs`: Add `main_focus` command
- `src-tauri/src/lib.rs`: Register `main_focus` in the invoke handler
- `src/App.tsx`: Extract `dispatchAction()` helper; capture-phase keydown listener with `stopPropagation`; `listen("app-action", ...)` handler; `main_focus` call before focus_chat and terminal focusPane
- `src/components/workspace/TabBar.tsx`: Fix CSS border shorthand mixing (React warning)
