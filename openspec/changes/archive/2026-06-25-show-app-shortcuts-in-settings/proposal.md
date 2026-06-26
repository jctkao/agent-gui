## Why

The settings panel already lets users edit browser shortcuts, but app-level shortcuts (open settings, focus chat, switch tabs, etc.) can only be changed by directly editing the SQLite database. Users have no in-app way to discover or remap them.

## What Changes

- Add an "App Shortcuts" section to the Keyboard Shortcuts settings tab, displayed as a separate table above the existing browser shortcuts table.
- Each app-level action (`open_settings`, `focus_chat`, `focus_workspace`, `tab_prev`, `tab_next`, `tab_first`, `tab_last`) becomes editable via the same `KeybindingRow` component used for browser shortcuts.
- Update the description text: move the "Changes take effect on the next page load" caveat to sit under the browser table only; add a note under the app table that changes take effect immediately.
- The sidebar tab label "Keyboard Shortcuts" stays unchanged.

## Capabilities

### New Capabilities

- `app-shortcuts-settings`: Editing app-level keyboard shortcuts from the settings UI.

### Modified Capabilities

_(none — no existing spec files to update)_

## Impact

- `src/components/settings/SettingsModal.tsx`: render app actions in a second table; split description text by section.
- No changes to `keybindings.ts`, `KeybindingRow.tsx`, `App.tsx`, or the backend — the overrides system already handles both contexts end-to-end.
