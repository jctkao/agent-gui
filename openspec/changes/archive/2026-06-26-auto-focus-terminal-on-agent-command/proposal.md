## Why

When an agent sends a command to the terminal, the user has to manually click the terminal tab before they can press Enter to execute it. Auto-switching focus eliminates this friction and makes the approval workflow feel seamless.

## What Changes

- When `handleInjectToTerminal` resolves a target terminal tab and confirms a valid PTY, automatically switch the active workspace tab to that terminal and focus the xterm instance.
- The Tauri window is also brought to the foreground so the user's keypress lands in the right place.

## Capabilities

### New Capabilities

- `terminal-auto-focus`: When the agent injects a command into a terminal tab, the UI switches to that tab and focuses the terminal so the user can press Enter immediately.

### Modified Capabilities

(none)

## Impact

- `src/components/chat/ChatPanel.tsx`: `handleInjectToTerminal` — 4-line addition after PTY is confirmed ready.
- No backend changes, no new dependencies.
