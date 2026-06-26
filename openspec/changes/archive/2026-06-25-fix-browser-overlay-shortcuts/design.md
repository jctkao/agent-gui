## Context

The app uses a Tauri child webview (`browser-overlay`) as a native overlay that sits on top of the main React webview. When the overlay has OS focus, its JS context receives all keyboard events — the main webview's `document.addEventListener("keydown")` is bypassed entirely. A second, unrelated problem: xterm.js (used for terminal panes) calls `stopPropagation()` on keydown events, so they never bubble to the document-level listener even though the terminal IS inside the main webview.

The app already has relevant infrastructure:
- `sync_keybindings` / `bindings_js()`: pushes keybinding data from the frontend into Rust managed state, injected into the overlay at page load
- `window.__TAURI__`: available in the child webview — the SPA monitor already uses `window.__TAURI__.event.emit`
- `browser-overlay.json` capability: grants only `core:event:allow-emit`; custom Tauri commands are NOT accessible from the overlay

## Goals / Non-Goals

**Goals:**
- App-level shortcuts fire from any focused pane: browser overlay, terminal, or editor
- No change to existing browser-context (Vimium) shortcut behavior
- No new Rust crates or Tauri plugins

**Non-Goals:**
- Making shortcuts work when the app is not the focused OS window (global shortcuts)
- Changing how keybindings are stored or configured

## Decisions

### Decision: Emit Tauri event from overlay, not invoke

**Chosen:** vimium.js calls `window.__TAURI__.event.emit('app-action', actionId)`. The `browser-overlay.json` capability only grants `core:event:allow-emit`, so Tauri command invocations from the overlay are blocked by the ACL. Emitting an event is already allowed, and `app.emit()` from the Rust side (which Tauri uses to broadcast frontend emits) reaches all webviews — including the main webview's `listen("app-action", ...)` handler.

**Rejected:** `window.__TAURI__.core.invoke('dispatch_app_action', ...)` — capability system blocks invoke from the browser-overlay for any command not listed in its capability. Discovered at runtime: the devtools error (`webview.internal_toggle_devtools not allowed`) confirmed the ACL is active.

**Rejected:** `tauri-plugin-global-shortcut` — shortcuts would fire even when the app is in the background, creating conflicts with other apps.

**Rejected:** Moving browser to `<iframe>` — cross-origin iframe sandboxing prevents loading arbitrary URLs.

### Decision: Inject app-level bindings as `window.__app_bindings`

`bindings_js()` previously only emitted browser-context bindings. It now also emits `window.__app_bindings = { actionId: keyString, ... }` (id → key). vimium.js inverts this at install time into `APP_KEY_MAP` (key → actionId), mirroring the existing `KEY_MAP` pattern. The two contexts are cleanly separated.

### Decision: `APP_KEY_MAP` checked before `KEY_MAP` in Normal mode only

App-level shortcuts take priority over browser shortcuts. If a key matches an app action, emit the event and return — the Vimium check is skipped. App shortcuts are NOT intercepted in Insert or Hint mode (the existing early returns in those branches already handle this).

### Decision: `main_focus` command to restore OS keyboard focus

`window.__TAURI__.event.emit` fires the App.tsx handler, but the browser-overlay child webview still holds OS keyboard focus — DOM `.focus()` calls in the main webview don't receive keystrokes. `main_focus` calls `app.get_webview("main").set_focus()`, mirroring how `browser_focus` works for the overlay. It is called before `chat-input.focus()` (focus_chat) and before `terminal.focus()` (focusPane terminal branch), sequenced via `.then()`.

**Note:** `get_webview_window("main").set_focus()` is insufficient — it focuses the window, not the specific WebView2 controller. `get_webview("main").set_focus()` targets the controller directly.

### Decision: Capture-phase keydown listener for terminal

xterm.js attaches its own keydown listener and calls `stopPropagation()`, so bubble-phase document listeners never fire when a terminal is focused. Registering with `{ capture: true }` (equivalently, the third argument `true`) means the listener fires before the event reaches xterm.js. `stopPropagation()` is called on match to prevent xterm from also processing the app shortcut key.

### Decision: `active` flag to fix React StrictMode async cleanup

`listen()` returns a promise. In development, React StrictMode mounts/unmounts effects twice. The cleanup runs synchronously, but `unlistenAppAction` is set asynchronously — the cleanup executes before the promise resolves, leaving a leaked listener. A second mount then registers a second listener, causing each action to fire twice. The `active` flag allows the cleanup to signal intent; if the promise resolves after cleanup, `fn()` is called immediately rather than stored.

## Risks / Trade-offs

- **`window.__TAURI__` availability at key time** — vimium.js is injected on `PageLoadEvent::Finished`, at which point `window.__TAURI__` is already present. If a page navigates before injection completes, `APP_KEY_MAP` is empty and the shortcut silently does nothing. → Acceptable; the window is short.

- **Key string format contract** — App.tsx `keyEventToString` and vimium.js both produce `"Alt+n"` style strings (modifier prefix + `e.key`). These must stay in sync. → Documented by co-locating `DEFAULT_APP_BINDINGS` in `keybindings.rs` with a comment.

- **Capture phase listener intercepts all keydowns** — the listener runs for every keydown in the app, not just when app shortcuts are pressed. It performs a single map lookup and returns immediately on no match — negligible overhead.
