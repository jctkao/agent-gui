## Why

The keyboard shortcuts in the browser pane are currently hardcoded in `vimium.js` with no way for users to change them. Users have different muscle memory and preferences — someone used to `hjkl` from Vim may want different bindings than the defaults. The settings panel already shows a shortcuts tab, but it's purely read-only. Making shortcuts customizable completes that UI and extends naturally to app-level shortcuts in the future.

## What Changes

- The `Keyboard Shortcuts` tab in Settings becomes an editable keybinding table with per-row key capture
- Users can press a key (or sequence like `gg`) to rebind any browser action
- Conflicts — including prefix conflicts — are detected and block saving
- Each row has a reset-to-default button; a global "Restore all defaults" is also available
- Bindings are persisted in SQLite and injected into `vimium.js` at page load via `window.__bindings`
- `vimium.js` is refactored to read from `window.__bindings` instead of hardcoded switch cases
- Action definitions include a `context` field (`"browser"` | `"app"`) so app-level shortcuts can be slotted in later without redesign

## Capabilities

### New Capabilities

- `keybinding-store`: Persist and retrieve user keybinding overrides from SQLite; merge overrides with defaults at runtime
- `keybinding-editor`: Editable keybinding table in Settings with key capture UX, conflict detection, per-row reset, and global restore

### Modified Capabilities

*(none — no existing specs change)*

## Impact

- **Frontend**: `src/lib/keybindings.ts` (new), `src/components/settings/KeybindingRow.tsx` (new), `src/components/settings/SettingsModal.tsx` (modified)
- **Rust**: `src-tauri/src/vimium.js` (modified), `src-tauri/src/commands/browser.rs` (modified), `src-tauri/src/lib.rs` (modified)
- **SQLite**: New key `keybindings` in the existing `settings` table (JSON value)
- **No new dependencies**
