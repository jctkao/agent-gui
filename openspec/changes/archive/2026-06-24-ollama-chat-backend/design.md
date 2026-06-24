## Context

The app is a Tauri 2 desktop application. The frontend is React/TypeScript; the backend is Rust. The existing PTY module (`src-tauri/src/pty.rs`) manages terminal sessions by spawning shell processes, exposing a reader thread that emits all output as Tauri events to the frontend. There is no way to intercept that output in Rust — bytes are consumed by the reader thread and emitted directly to the frontend.

Ollama is a local LLM server exposing a REST API at `http://localhost:11434`. Its `/api/chat` endpoint accepts a message history and an optional `tools` array, and returns a response that may include `tool_calls`.

## Goals / Non-Goals

**Goals:**
- Replace PTY passthrough in ChatPanel with real Ollama LLM conversation
- Agentic loop lives entirely in Rust: Ollama calls, conversation state, tool dispatch, approval waiting
- Single tool exposed to the model: `run_terminal_command`
- User must approve each tool call before execution
- Ollama config (URL, model) stored in existing SQLite settings, editable via Settings modal
- System prompt field reserved in state for future use (empty by default, not exposed in UI)

**Non-Goals:**
- Streaming token output (full response wait; streaming is a future enhancement)
- Multiple tools or tool chaining beyond `run_terminal_command`
- Modifying the existing PTY/terminal tab behavior
- Remote Ollama servers requiring auth (no auth header support in v1)

## Decisions

### D1: Agentic loop in Rust, not React

The loop (`call Ollama → detect tool call → wait for approval → execute → continue`) lives as a `tokio::spawn` task in Rust rather than orchestrated by React.

**Why:** Keeps conversation state server-side and avoids multiple round-trip `invoke` calls for each iteration. The frontend becomes a thin event consumer.

**Alternative considered:** Loop in React — simpler initially, but leaks conversation state into the frontend and makes it harder to add server-side features (logging, timeout, cancellation) later.

---

### D2: Approval via `tokio::sync::oneshot` channel

When the loop detects a tool call, it:
1. Creates a `oneshot::channel::<bool>()`
2. Stores `tx` in `AgentState` (Tauri managed state)
3. Emits `agent-approval-needed` to the frontend
4. Awaits `rx` — the loop is parked

When the user clicks Approve/Reject, the frontend calls `invoke("agent_approve", { approved })`. That command takes `tx` from `AgentState` and sends the bool, unparking the loop.

**Why:** Clean async coordination without polling. The loop task blocks on a future, not a spin-wait.

**Alternative considered:** Storing a flag in a `Mutex<Option<bool>>` and polling — more complex, wastes CPU, harder to reason about.

---

### D3: Tool execution via `std::process::Command`, not PTY

Terminal commands run via `std::process::Command::new("powershell").arg("-Command").arg(&cmd).output()`. Output (stdout + stderr) is captured synchronously in Rust, fed back to Ollama as a tool result, and also emitted to the frontend as `agent-tool-ran` so the chat shows what ran and what it returned.

**Why:** The existing PTY reader thread consumes bytes into frontend events — there is no mechanism to also read them in Rust without significant refactoring. `Command::output()` is simple and captures output cleanly.

**Trade-off:** Commands run in an isolated subprocess, not the user's visible terminal session. Shell state (`cd`, environment variables) does not persist between tool calls.

**Alternative considered:** Modifying `pty.rs` to dual-sink (emit to frontend AND a Rust channel) — deferred to a future enhancement if stateful shell sessions become necessary.

---

### D4: Non-streaming Ollama calls

Requests use `"stream": false`. Rust waits for the full JSON response before emitting `agent-message` or processing a tool call.

**Why:** Simplest path for the agentic loop. Tool calls appear at the end of a streaming response, requiring a state machine to distinguish "accumulating text" from "accumulating tool call JSON." Non-streaming avoids this entirely.

**Trade-off:** No live typing effect. Frontend shows a loading state while Rust waits.

**Future:** Add streaming (SSE/NDJSON parsing) once the loop is stable.

---

### D5: AgentState as Tauri managed state

```rust
pub struct AgentState {
    pub messages: Vec<serde_json::Value>,        // full conversation history
    pub approval_tx: Option<oneshot::Sender<bool>>,  // parked while awaiting approval
    pub system_prompt: Option<String>,           // reserved, always None for now
}
```

Wrapped in `Mutex<AgentState>` and registered via `.manage(...)`. `agent_start` resets `messages` (new conversation per session start) and spawns the loop task with a clone of the `AppHandle`.

**Why:** Tauri managed state is the idiomatic way to share mutable data across commands. The `Mutex` serializes access — the loop holds it only briefly to read/write messages or park the approval sender.

## Risks / Trade-offs

- **Concurrent `agent_start` calls** → If user sends a new message while a loop is running, a second task spawns with a fresh message list, abandoning the first. Mitigation: frontend disables input while `agent-done` has not been received.
- **Ollama not running** → `reqwest` returns a connection error. Mitigation: Rust returns an error, frontend shows a friendly message (e.g., "Ollama is not reachable at \<url\>").
- **Tool execution timeout** → `Command::output()` blocks the tokio thread. Mitigation: wrap with `tokio::task::spawn_blocking` to avoid blocking the async runtime.
- **Model doesn't support tool calling** → Ollama returns a plain text response with no `tool_calls`. Loop treats it as a final answer and emits `agent-message`. Functionally degrades gracefully; user just can't use tool features.
- **No conversation persistence** → `messages` lives in `AgentState` (in-memory). Closing the app clears history. Acceptable for v1.

## Open Questions

- Should rejected tool calls cause the loop to ask the model to respond differently, or terminate the turn immediately? (Current plan: add a `tool` role message with "User rejected the command." and let Ollama respond.)
- Should the Settings modal validate the Ollama URL (e.g., attempt a `/api/tags` ping) before saving?
