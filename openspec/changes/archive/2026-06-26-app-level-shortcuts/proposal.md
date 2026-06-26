## Why

Navigating between the chat panel and workspace panes currently requires the mouse. App-level keyboard shortcuts let power users keep their hands on the keyboard for all common navigation tasks.

## What Changes

- Add 6 configurable app-level shortcut actions to the existing keybinding system
- Add `browser_focus` Tauri command to claim focus on the native browser overlay webview
- Lift settings modal state from `TitleBar` to `App` so the global dispatcher can trigger it
- Wire a global `keydown` dispatcher in `App` that resolves user-configured bindings and executes the matching action

Default bindings:

| Key | Action |
|-----|--------|
| `Alt+N` | Focus chat panel → put cursor in input box |
| `Alt+M` | Focus workspace → focus active pane content |
| `Alt+J` | Select previous tab (no wrap) |
| `Alt+K` | Select next tab (no wrap) |
| `Alt+1` | Select first tab |
| `Alt+0` | Select last tab |
| `Ctrl+,` | Open settings modal (existing action, now implemented) |

After any tab selection shortcut, focus automatically moves to the newly active pane.

## Capabilities

### New Capabilities

- `app-shortcuts`: Global keyboard shortcut dispatcher — resolves user-configured bindings and dispatches focus, tab navigation, and settings actions

### Modified Capabilities

- (none — keybinding storage and settings UI are implementation details, not spec-level behavior changes)

## Impact

- `src/lib/keybindings.ts`: 6 new entries in `ACTION_DEFINITIONS` (5 new + update `focus_chat` default key)
- `src/App.tsx`: Global `keydown` listener, settings modal state lifted here
- `src/components/layout/TitleBar.tsx`: Accepts `onOpenSettings` prop, removes local settings state
- `src/components/chat/ChatPanel.tsx`: `id="chat-input"` added to input element
- `src-tauri/src/commands/browser.rs`: New `browser_focus` command
- `src-tauri/src/lib.rs`: Register `browser_focus` in invoke handler
