## ADDED Requirements

### Requirement: App-level shortcut forwarding via Tauri event
In Normal mode, when a keydown event matches a configured app-level shortcut, the vimium script SHALL call `window.__TAURI__.event.emit('app-action', actionId)` and suppress the event from reaching the page. App-level shortcut checking MUST occur before browser-context shortcut checking. (Tauri command invocation (`invoke`) is NOT used — the browser-overlay capability only grants `core:event:allow-emit`, blocking invoke.)

#### Scenario: App shortcut fires from browser overlay
- **WHEN** the browser overlay is in Normal mode and the user presses a key bound to an app-level action (e.g., Alt+j for tab_next)
- **THEN** the vimium script emits `"app-action"` with the action ID via `window.__TAURI__.event`, prevents default browser behavior, and does NOT trigger any browser-context Vimium action

#### Scenario: App shortcuts are suppressed in Insert mode
- **WHEN** the browser overlay is in Insert mode (an editable element has focus) and the user presses an app-level shortcut key
- **THEN** the key is passed through to the focused element as normal; no Tauri event is emitted

#### Scenario: App shortcuts are suppressed in Hint mode
- **WHEN** the browser overlay is in Hint mode and the user presses an app-level shortcut key
- **THEN** the key is consumed by hint-mode logic as normal; no Tauri event is emitted

#### Scenario: Non-matching modifier combos pass through
- **WHEN** the user presses a modifier-key combination that is not bound to any app-level action
- **THEN** the event is not intercepted by app shortcut handling and proceeds to normal Vimium or browser processing
