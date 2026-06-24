## REMOVED Requirements

### Requirement: Chat sends command to active terminal
**Reason**: Chat panel is now connected to the Ollama agentic loop instead of routing input to a PTY. Terminal command execution is handled by the agent via tool calls with user approval.
**Migration**: The terminal tab still exists and is fully functional. Terminal interaction is unchanged — only the chat panel input path changes.

### Requirement: Terminal output shown in chat
**Reason**: PTY output is no longer displayed in the chat panel. Ollama's text responses and tool execution results are shown instead via `agent-message` and `agent-tool-ran` events.
**Migration**: None. Terminal tab continues to show PTY output as before.

---

## MODIFIED Requirements

### Requirement: PTY ID shared via store
Each terminal pane SHALL expose its PTY session ID through the Zustand workspace store so terminal pane components can interact with their own PTY. The chat panel SHALL NOT access PTY IDs directly.

#### Scenario: PTY ID available after terminal mounts
- **WHEN** a terminal pane successfully creates a PTY session via `pty_create`
- **THEN** the pane's `ptyId` field in the workspace store SHALL be set to the returned session ID

#### Scenario: PTY ID absent before terminal mounts
- **WHEN** a terminal pane's type is `"terminal"` but `pty_create` has not yet resolved
- **THEN** the pane's `ptyId` in the store SHALL be `undefined`

---

## ADDED Requirements

### Requirement: Chat input routes to Ollama agent
The chat panel SHALL invoke `agent_start(user_message)` when the user submits input, and disable the input field until `agent-done` is received.

#### Scenario: User submits a message
- **WHEN** the user types a message and presses Enter or the send button
- **THEN** the message SHALL appear as a user bubble in the chat
- **AND** `agent_start` SHALL be invoked with the message text
- **AND** the input field SHALL be disabled

#### Scenario: Agent completes its turn
- **WHEN** the `agent-done` event is received
- **THEN** the input field SHALL be re-enabled

---

### Requirement: LLM response display
The chat panel SHALL display Ollama's text responses as assistant messages when `agent-message` is received.

#### Scenario: Agent returns a text response
- **WHEN** the `agent-message` event is received
- **THEN** the content SHALL appear as an assistant bubble in the chat

---

### Requirement: Tool approval UI
When `agent-approval-needed` is received, the chat panel SHALL display an approval widget showing the proposed command and two buttons: Approve and Reject.

#### Scenario: Approval widget shown
- **WHEN** `agent-approval-needed` is received with a command string
- **THEN** the chat SHALL display the command in a styled block
- **AND** show Approve and Reject buttons
- **AND** the input field SHALL remain disabled

#### Scenario: User approves
- **WHEN** the user clicks Approve
- **THEN** `agent_approve(true)` SHALL be invoked
- **AND** the approval widget SHALL be replaced with a "Running…" indicator

#### Scenario: User rejects
- **WHEN** the user clicks Reject
- **THEN** `agent_approve(false)` SHALL be invoked
- **AND** the approval widget SHALL be dismissed

---

### Requirement: Tool execution result display
The chat panel SHALL display what command was run and its output when `agent-tool-ran` is received.

#### Scenario: Tool ran successfully
- **WHEN** `agent-tool-ran` is received
- **THEN** the chat SHALL display the command and its captured output in a monospace block
