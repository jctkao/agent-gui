## Why

The app currently treats the chat panel and terminal tab as isolated components — users cannot drive the terminal from the chat. This change validates that the backend PTY layer can be orchestrated from the frontend chat, and delivers a concrete "command runner" UX as proof.

## What Changes

- Chat input box accepts shell commands and sends them to the active terminal PTY
- If no terminal tab is open, one is automatically created before the command is sent
- Command appears in the right-side terminal and executes normally
- Terminal output (stripped of ANSI codes) is captured and shown in the chat panel as an assistant-style response
- The PTY ID for each terminal pane is shared via Zustand store so any component can interact with it

## Capabilities

### New Capabilities

- `chat-terminal-bridge`: Bidirectional link between chat panel and terminal PTY — send commands from chat, receive output back as assistant messages

### Modified Capabilities

- (none)

## Impact

- `src/store/workspace.ts` — adds `ptyId?: string` to `Pane` and `setPtyId` action
- `src/components/workspace/panes/TerminalPane.tsx` — calls `setPtyId` after `pty_create` succeeds
- `src/components/chat/ChatPanel.tsx` — replaces stub messages and TODO with real PTY interaction logic
- No Rust changes required; existing `pty_write`, `pty-data-*` events are sufficient
