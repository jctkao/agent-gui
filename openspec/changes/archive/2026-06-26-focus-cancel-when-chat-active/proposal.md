## Why

When the agent triggers a terminal command, the chat panel shows a cancel button — but focus immediately jumps to the terminal, forcing the user to reach for the mouse to cancel. If the user is already focused in the chat panel, the cancel button should receive focus automatically so they can press Space to cancel.

## What Changes

- When `agent-command-to-terminal` fires and focus is in the chat panel, skip the terminal focus step and instead focus the cancel button in the terminal-waiting widget.
- The workspace tab still switches to the terminal (user can see what's pending), and the window is still brought to the foreground — only the keyboard focus destination changes.
- Current behavior (focus goes to terminal) is preserved when focus is NOT in the chat panel.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `terminal-auto-focus`: Add a conditional scenario — when the chat panel has keyboard focus at the moment the agent sends a command, focus the cancel button instead of the terminal xterm instance.

## Impact

- `src/components/chat/ChatPanel.tsx`: detect focus at event time, pass flag into `handleInjectToTerminal`, attach callback ref to cancel button.
- No backend changes. No new dependencies.
