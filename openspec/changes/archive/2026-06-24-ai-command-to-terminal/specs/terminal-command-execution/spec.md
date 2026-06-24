## ADDED Requirements

### Requirement: AI command is injected into the active terminal without auto-executing
When the AI agent decides to run a shell command, the system SHALL write the command text into the active PTY terminal's readline buffer without a trailing newline, so the user can review and optionally edit the command before pressing Enter.

#### Scenario: Active tab is a terminal
- **WHEN** the agent emits `agent-command-to-terminal` and the active workspace tab has `type === "terminal"` with a valid `ptyId`
- **THEN** the command text is written to that PTY via `pty_write` without a trailing newline, and the command appears pre-typed in the terminal prompt

#### Scenario: Active tab is not a terminal
- **WHEN** the agent emits `agent-command-to-terminal` and the active workspace tab is not a terminal
- **THEN** a new terminal tab is opened, becomes active, and once its `ptyId` is available the command text is written to it without a trailing newline

### Requirement: Chat shows a waiting UI with a Cancel button while terminal awaits input
While the agent is waiting for terminal execution, the Chat panel SHALL display a lightweight card showing the suggested command text and a Cancel button. No Execute button is shown.

#### Scenario: Waiting card is displayed
- **WHEN** `agent-command-to-terminal` is received
- **THEN** Chat displays a card with the command text and a single Cancel button; the chat input remains disabled

#### Scenario: User cancels from Chat
- **WHEN** the user clicks the Cancel button in the Chat waiting card
- **THEN** `agent_terminal_result` is called with `cancelled: true`, the waiting card is removed, and the agent loop resumes and stops

### Requirement: Agent history records the actually-executed command
The agent's message history SHALL record the command that was actually executed (as captured from the PTY echo), not the originally suggested command.

#### Scenario: User runs the command as-is
- **WHEN** the user presses Enter without editing the pre-typed command
- **THEN** the tool message pushed to history contains the original command text and the captured output

#### Scenario: User edits the command before running
- **WHEN** the user modifies the pre-typed command and then presses Enter
- **THEN** the tool message pushed to history contains the edited command text and the captured output

### Requirement: agent_approve command is removed; agent_terminal_result is the new completion path
The `agent_approve` Tauri command SHALL be removed. A new `agent_terminal_result` command SHALL be registered that accepts `command: String`, `output: String`, and `cancelled: bool`.

#### Scenario: Successful execution result
- **WHEN** `agent_terminal_result` is invoked with `cancelled: false`
- **THEN** the agent loop unparks, appends a tool message with the provided command and output, and continues to the next Ollama call

#### Scenario: Cancelled execution
- **WHEN** `agent_terminal_result` is invoked with `cancelled: true`
- **THEN** the agent loop unparks, appends a tool message with content `"User cancelled the command."`, and emits `agent-done`
