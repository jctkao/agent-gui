## 1. Rust Backend — State & Types

- [x] 1.1 Add `TerminalResult` struct (`command: String`, `output: String`, `cancelled: bool`) in `agent/state.rs`
- [x] 1.2 Change `approval_tx` field type from `oneshot::Sender<bool>` to `oneshot::Sender<TerminalResult>` in `AgentState`

## 2. Rust Backend — Commands

- [x] 2.1 Add `agent_terminal_result` Tauri command in `agent/commands.rs`: takes `command`, `output`, `cancelled`; pops `approval_tx` from state and sends a `TerminalResult` through the channel
- [x] 2.2 Remove `agent_approve` command from `agent/commands.rs`
- [x] 2.3 In `run_loop`, replace the `approved: bool` branch with `TerminalResult` handling: if `cancelled`, push `"User cancelled the command."` tool message and break; otherwise push tool message with `result.command` and `result.output`
- [x] 2.4 Remove the `spawn_blocking` / `powershell -Command` subprocess execution block from `run_loop`
- [x] 2.5 Change the emitted event name from `"agent-approval-needed"` to `"agent-command-to-terminal"` in `run_loop`
- [x] 2.6 Update `lib.rs` to register `agent_terminal_result` and remove `agent_approve` from the invoke handler list

## 3. Frontend — ChatPanel PTY Injection

- [x] 3.1 In `ChatPanel.tsx`, add a listener for `"agent-command-to-terminal"` event (replaces `"agent-approval-needed"` listener)
- [x] 3.2 On receiving the event: read `activeTabId` from workspace store; if the active tab is a terminal with a `ptyId`, use it; otherwise call `addTab` with a new terminal pane and wait for its `ptyId` (store subscription with timeout)
- [x] 3.3 Call `pty_write` with the command bytes (no trailing `\n`) to inject the command into the terminal

## 4. Frontend — ChatPanel Output Capture

- [x] 4.1 Before injection, read the last non-empty line from xterm's active buffer (via `terminalRegistry` or a ref passed from TerminalPane) to snapshot the current prompt text; fall back to regex `/^PS .*>\s*$/m`
- [x] 4.2 After injection, subscribe to `pty-data-<ptyId>` and accumulate raw bytes in a ref buffer
- [x] 4.3 On each chunk: decode UTF-8, strip ANSI escape codes, split into lines; scan for the next prompt boundary
- [x] 4.4 Detect Ctrl+C cancellation: if accumulated output (stripped) is empty or only `^C` and a prompt appears, call `agent_terminal_result({ command: "", output: "", cancelled: true })`
- [x] 4.5 On prompt detection: extract the first echo line as `command`, join remaining non-empty lines as `output`; call `agent_terminal_result({ command, output, cancelled: false })`
- [x] 4.6 Always clean up the `pty-data-<ptyId>` unlisten function after `agent_terminal_result` is invoked (success, cancel, or chat-cancel)

## 5. Frontend — ChatPanel Waiting UI

- [x] 5.1 Replace the `"approval"` message role UI with a new `"terminal-waiting"` role that shows the suggested command text and a Cancel button (no Execute button)
- [x] 5.2 Cancel button handler: call unlisten, then invoke `agent_terminal_result({ command: "", output: "", cancelled: true })`; remove the waiting card from messages
- [x] 5.3 Remove the old `handleApprove` function and `agent_approve` invocation
- [x] 5.4 On receiving `"agent-tool-ran"` equivalent (agent loop done): replace waiting card with a `"tool-ran"` result card showing the actual command and output (listen for a new `"agent-tool-ran"` event emitted from the Rust side if desired, or derive from the next `agent-message`)
