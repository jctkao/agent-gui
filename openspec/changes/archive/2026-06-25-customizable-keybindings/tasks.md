## 1. Rust — Managed State & Startup Load

- [x] 1.1 Add `KeybindingState` struct to `src-tauri/src/commands/` (HashMap<String,String> for browser context) and register it as managed state in `lib.rs`
- [x] 1.2 In `lib.rs` `setup()`, load the `"keybindings"` SQLite entry via `async_runtime::block_on` and populate `KeybindingState` (fall back to empty map if absent)

## 2. Rust — save_keybindings Command

- [x] 2.1 Add `save_keybindings(overrides: HashMap<String,String>)` Tauri command that writes JSON to SQLite `settings` key `"keybindings"` and updates `KeybindingState` managed state
- [x] 2.2 Register the command in `lib.rs` invoke handler

## 3. Rust — Inject Bindings into vimium.js

- [x] 3.1 In `lib.rs` `on_page_load`, before `wv.eval(include_str!("vimium.js"))`, read `KeybindingState` and inject `window.__bindings = {...}` via `wv.eval()`
- [x] 3.2 Ensure the injection serializes all ten browser action ids to their effective keys (override if present, else default from a Rust-side constant map)

## 4. vimium.js — Read from window.__bindings

- [x] 4.1 Replace the hardcoded `HINT_CHARS`, `SCROLL_STEP`, and `switch(key)` block with lookups into `window.__bindings`
- [x] 4.2 Generalize the `gg` special-case sequence timer into a generic sequence-matching loop that reads sequence bindings from `window.__bindings`

## 5. Frontend — keybindings.ts

- [x] 5.1 Create `src/lib/keybindings.ts` with the `ACTION_DEFINITIONS` table (id, label, context, defaultKey) for all ten browser actions plus placeholder app-context slots
- [x] 5.2 Export `resolveBindings(overrides)` that merges overrides with defaults and returns the effective map
- [x] 5.3 Export `loadOverrides()` and `saveOverrides(overrides)` helpers that read/write from SQLite via the existing `getSetting`/`setSetting` API

## 6. Frontend — KeybindingRow Component

- [x] 6.1 Create `src/components/settings/KeybindingRow.tsx` with capture-mode state machine: idle → recording → (key pressed → 1s timer) → proposed
- [x] 6.2 Implement single-key capture: listen for `keydown`, store `e.key`; start 1-second timer; on expire commit as binding
- [x] 6.3 Implement sequence extension: if a second key arrives within the 1-second window, concatenate and restart timer
- [x] 6.4 Implement modifier combo capture: if `e.ctrlKey`/`e.altKey`/`e.metaKey` is set, format as `"Ctrl+X"` and commit immediately (no timer)
- [x] 6.5 Implement Escape-to-cancel: Escape in recording state aborts without changing the binding
- [x] 6.6 Implement click-outside-to-cancel via `blur` or document `mousedown` listener
- [x] 6.7 Display proposed key with conflict warning inline; disable confirm when conflict exists

## 7. Frontend — Conflict Detection

- [x] 7.1 Implement `detectConflicts(actionId, proposedKey, effectiveMap)` in `keybindings.ts`: returns `null` or a conflict description string
- [x] 7.2 Check direct conflict: any other action in the same context has the same effective key
- [x] 7.3 Check prefix conflict: any other action's key starts with the proposed key, or the proposed key starts with any other action's key (`e.startsWith(p) || p.startsWith(e)`)

## 8. Frontend — SettingsModal Keyboard Shortcuts Tab

- [x] 8.1 Replace the static `SHORTCUTS` array and read-only table in `SettingsModal.tsx` with a live `effectiveBindings` state loaded from `loadOverrides()` on mount
- [x] 8.2 Render one `KeybindingRow` per action definition; pass effective key, conflict state, and callbacks
- [x] 8.3 Implement per-row reset: call `saveOverrides` with the action's override removed; refresh effective bindings
- [x] 8.4 Add "Restore all defaults" button: call `saveOverrides({})` then refresh; add a confirmation step before executing
- [x] 8.5 Visually distinguish overridden rows from default rows (e.g. bold key display or asterisk marker)
