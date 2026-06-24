## Why

The current AI agent approval flow runs commands in an isolated subprocess, disconnected from the real terminal environment. This means commands run without the user's working directory, shell history, or environment variables — and the user's only choice is binary approve/reject with no ability to edit the command before execution.

## What Changes

- Replace the in-chat approval widget (執行/拒絕 buttons) with a terminal-driven execution model
- AI-suggested commands appear pre-typed in the active terminal (right panel), where the user can review and edit before pressing Enter
- Left panel Chat shows a lightweight "waiting" UI with a Cancel button only — no Execute button
- Command output is captured from the PTY stream and returned to the AI agent loop
- The AI history records the actually-executed command (post-edit), not the originally suggested one
- **BREAKING**: `agent_approve` Tauri command is removed; replaced by `agent_terminal_result`
- **BREAKING**: `agent-approval-needed` event is removed; replaced by `agent-command-to-terminal`

## Capabilities

### New Capabilities

- `terminal-command-execution`: AI commands are injected into the active PTY terminal (without newline), user reviews/edits and presses Enter to execute; output is captured via PTY stream monitoring and returned to the agent loop
- `pty-output-capture`: Frontend listens to `pty-data-<id>` events, strips ANSI codes, and detects the next PowerShell prompt to delimit command output boundaries

### Modified Capabilities

_(none — no existing spec files)_

## Impact

- `src-tauri/src/agent/state.rs`: `approval_tx` type changes from `Sender<bool>` to `Sender<TerminalResult>`
- `src-tauri/src/agent/commands.rs`: removes subprocess execution logic; adds `agent_terminal_result` command; removes `agent_approve` command
- `src-tauri/src/lib.rs`: command registration update
- `src/components/chat/ChatPanel.tsx`: replaces approval UI with terminal-waiting UI; adds PTY injection and output capture logic
- `src/components/workspace/panes/TerminalPane.tsx`: no changes required
- `src/store/workspace.ts`: no changes required
