## ADDED Requirements

### Requirement: Start a conversation turn
The system SHALL expose a Tauri command `agent_start(user_message: String)` that appends the user message to the in-memory conversation history and spawns a Rust async task to run the agentic loop.

#### Scenario: First message in a session
- **WHEN** the user sends a message with no prior conversation history
- **THEN** `agent_start` SHALL add the user message to an empty messages list
- **AND** spawn the agentic loop task

#### Scenario: Subsequent message in a session
- **WHEN** the user sends a message after prior exchanges exist
- **THEN** `agent_start` SHALL append the user message to the existing history
- **AND** spawn the agentic loop task with full context

---

### Requirement: Agentic loop calls Ollama
The agentic loop task SHALL POST to `<ollama_url>/api/chat` with `stream: false`, the current message history, the configured model, and the `run_terminal_command` tool definition.

#### Scenario: Successful Ollama response with text
- **WHEN** Ollama returns a response with a text message and no tool calls
- **THEN** the loop SHALL emit `agent-message` with the response content
- **AND** emit `agent-done`
- **AND** append the assistant message to the conversation history

#### Scenario: Ollama unreachable
- **WHEN** the HTTP request to Ollama fails (connection refused, timeout, etc.)
- **THEN** the loop SHALL emit `agent-message` with a human-readable error describing the failure
- **AND** emit `agent-done`

---

### Requirement: Tool call detection and approval request
When Ollama returns a `tool_calls` array, the agentic loop SHALL pause and request user approval before executing.

#### Scenario: Ollama requests tool call
- **WHEN** Ollama returns a response containing `tool_calls` with `name: "run_terminal_command"`
- **THEN** the loop SHALL store a `oneshot::Sender<bool>` in managed `AgentState`
- **AND** emit `agent-approval-needed` with the proposed command string
- **AND** block on the corresponding `oneshot::Receiver<bool>`

---

### Requirement: Process approval decision
The system SHALL expose a Tauri command `agent_approve(approved: bool)` that unblocks the waiting agentic loop.

#### Scenario: User approves tool execution
- **WHEN** `agent_approve` is called with `approved: true`
- **THEN** the command SHALL take the stored `oneshot::Sender<bool>` from `AgentState`
- **AND** send `true` to unblock the loop
- **AND** the loop SHALL execute the command via `std::process::Command` (PowerShell `-Command`)

#### Scenario: User rejects tool execution
- **WHEN** `agent_approve` is called with `approved: false`
- **THEN** the command SHALL send `false` to unblock the loop
- **AND** the loop SHALL add a tool result message with content "User rejected the command."
- **AND** call Ollama again so the model can respond to the rejection

---

### Requirement: Tool execution and result relay
When a tool call is approved, the loop SHALL execute the command and return its output to Ollama.

#### Scenario: Command produces output
- **WHEN** the approved command runs and exits
- **THEN** the loop SHALL capture combined stdout and stderr
- **AND** emit `agent-tool-ran` with the command string and captured output
- **AND** append a `tool` role message (with the tool call ID) to the history
- **AND** continue the agentic loop with the updated history

#### Scenario: Command exits with non-zero code
- **WHEN** the command exits with a non-zero status
- **THEN** stderr SHALL be included in the tool result alongside stdout
- **AND** the loop SHALL continue (Ollama decides how to handle the error)

---

### Requirement: System prompt slot reserved
`AgentState` SHALL contain a `system_prompt: Option<String>` field. When non-`None`, it SHALL be prepended to the messages array as a `system` role message before each Ollama call. In v1, this field is always `None`.

#### Scenario: System prompt is None (v1 default)
- **WHEN** `system_prompt` is `None`
- **THEN** no system message SHALL be added to the Ollama request
