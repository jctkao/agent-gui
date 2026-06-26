## 1. Rust — inject app bindings into overlay

- [x] 1.1 In `keybindings.rs`, add `DEFAULT_APP_BINDINGS` constant and extend `bindings_js()` to emit `window.__app_bindings={actionId:keyString,...}` for all app-context actions alongside `window.__bindings`.

## 2. Rust — add `main_focus` command

- [x] 2.1 In `browser.rs`, add `main_focus(app: AppHandle)` command that calls `app.get_webview("main").set_focus()` — targets the WebView2 controller directly, not the window wrapper.
- [x] 2.2 Register `main_focus` in the invoke handler in `lib.rs`.

## 3. vimium.js — build APP_KEY_MAP and forward shortcuts

- [x] 3.1 After the existing `KEY_MAP` build, add `APP_KEY_MAP`: invert `window.__app_bindings` (key string → action id).
- [x] 3.2 In the normal-mode keydown handler, before the existing `KEY_MAP` check, check `APP_KEY_MAP[key]`. On match: call `window.__TAURI__.event.emit('app-action', APP_KEY_MAP[key])`, call `e.preventDefault()`, and return. (Note: `invoke` is blocked by the browser-overlay capability — use `emit` which is already allowed by `core:event:allow-emit`.)
- [x] 3.3 Confirm app-level keys are NOT intercepted when `mode === 'insert'` or `mode === 'hint'` — existing early returns in those branches already handle this; no code change needed.

## 4. App.tsx — listen for forwarded actions and fix keyboard handling

- [x] 4.1 Extract the action dispatch `switch` block from `onKeyDown` into a standalone `dispatchAction(actionId: string, e?: KeyboardEvent)` function; call `e?.preventDefault()` and `e?.stopPropagation()` per case.
- [x] 4.2 Import `listen` from `@tauri-apps/api/event`; add `listen<string>("app-action", (event) => dispatchAction(event.payload))` inside the `useEffect`; fix async cleanup with an `active` flag so StrictMode double-mount doesn't leave a leaked listener.
- [x] 4.3 Switch `document.addEventListener("keydown", onKeyDown)` to capture phase (`true` as third argument) so xterm.js `stopPropagation` cannot block the listener; add `e.stopPropagation()` in `onKeyDown` on match.

## 5. App.tsx — OS focus transfer via `main_focus`

- [x] 5.1 In `focus_chat` case of `dispatchAction`: call `invoke("main_focus").then(() => chat-input.focus())` so OS keyboard focus moves from the overlay to the main webview before DOM focus is set.
- [x] 5.2 In `focusPane` terminal branch: call `invoke("main_focus").then(() => terminal.focus())` for the same reason.

## 6. TabBar.tsx — fix CSS border shorthand warning

- [x] 6.1 Replace `border: "2px solid"` + `borderBottom: "none"` in `baseWrap` with `borderWidth: "2px 2px 0"` + `borderStyle: "solid"` to eliminate React's shorthand-mixing warning when switching between active/inactive tab styles.
