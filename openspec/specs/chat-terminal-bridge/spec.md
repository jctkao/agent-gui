# Spec: chat-terminal-bridge

## Purpose

Enables the chat panel to send commands directly to a terminal PTY session and display the resulting output as assistant messages, bridging the chat UI with the terminal backend.

## Requirements

### Requirement: PTY ID shared via store
Each terminal pane SHALL expose its PTY session ID through the Zustand workspace store so other components can interact with the PTY without prop-drilling.

#### Scenario: PTY ID available after terminal mounts
- **WHEN** a terminal pane successfully creates a PTY session via `pty_create`
- **THEN** the pane's `ptyId` field in the workspace store SHALL be set to the returned session ID

#### Scenario: PTY ID absent before terminal mounts
- **WHEN** a terminal pane's type is `"terminal"` but `pty_create` has not yet resolved
- **THEN** the pane's `ptyId` in the store SHALL be `undefined`

---

### Requirement: Chat sends command to active terminal
The chat panel SHALL send the user's input as a shell command to the currently active terminal PTY when the user submits the chat input.

#### Scenario: Active terminal exists
- **WHEN** the user submits text in the chat input
- **AND** an active terminal tab with a populated `ptyId` exists
- **THEN** the text SHALL be written to that PTY as UTF-8 bytes followed by a newline (`\n`)
- **AND** the text SHALL appear as a user message in the chat panel

#### Scenario: No terminal tab exists
- **WHEN** the user submits text in the chat input
- **AND** no terminal tab exists in the workspace
- **THEN** a new PowerShell terminal tab SHALL be automatically opened
- **AND** the system SHALL wait for that tab's `ptyId` to be populated (up to 5 seconds)
- **AND** the command SHALL then be sent to the new terminal's PTY
- **AND** the text SHALL appear as a user message in the chat panel

#### Scenario: Terminal tab exists but PTY not yet ready
- **WHEN** the user submits text in the chat input
- **AND** a terminal tab exists but its `ptyId` is still `undefined`
- **THEN** the system SHALL wait up to 5 seconds for `ptyId` to be set before sending
- **AND** if the timeout expires, an error message SHALL appear in chat as an assistant message

---

### Requirement: Terminal output shown in chat
The chat panel SHALL display the output produced by the terminal PTY after a command is sent, formatted as an assistant message.

#### Scenario: Command produces output within collection window
- **WHEN** a command has been sent to the PTY
- **AND** the PTY emits `pty-data-*` events within 1.5 seconds
- **THEN** all received bytes SHALL be decoded as UTF-8
- **AND** ANSI/VT escape sequences SHALL be stripped
- **AND** the cleaned text SHALL appear in the chat panel as an assistant-style message

#### Scenario: Collection window expires with no output
- **WHEN** a command has been sent to the PTY
- **AND** no `pty-data-*` events are received within 1.5 seconds
- **THEN** no assistant message SHALL be added to the chat

#### Scenario: Output includes echoed command
- **WHEN** the PTY echoes the sent command back in its output
- **THEN** the leading line matching the sent command SHALL be stripped from the displayed output
