## 1. Rust Dependencies

- [x] 1.1 Add `reqwest = { version = "0.12", features = ["json"] }` to `src-tauri/Cargo.toml`
- [x] 1.2 Add `tokio = { version = "1", features = ["full"] }` to `src-tauri/Cargo.toml`

## 2. Rust Agent Module

- [x] 2.1 Create `src-tauri/src/agent/mod.rs` — declare submodules (`state`, `ollama`, `commands`)
- [x] 2.2 Create `src-tauri/src/agent/state.rs` — define `AgentState` struct with `messages: Vec<serde_json::Value>`, `approval_tx: Option<tokio::sync::oneshot::Sender<bool>>`, `system_prompt: Option<String>`; wrap in `Mutex<AgentState>` and derive `Default`
- [x] 2.3 Create `src-tauri/src/agent/ollama.rs` — implement `call_ollama(url, model, messages) -> Result<serde_json::Value, String>` using `reqwest::Client`, POST to `/api/chat` with `stream: false` and the `run_terminal_command` tool definition in the request body
- [x] 2.4 Create `src-tauri/src/agent/commands.rs` — implement `agent_start` and `agent_approve` Tauri commands

## 3. Agentic Loop

- [x] 3.1 In `agent_start`: read `ollama_url` and `ollama_model` from SQLite via a direct `tauri_plugin_sql` call (or accept them as parameters from frontend); append user message to `AgentState.messages`; spawn `tokio::spawn` task for the loop
- [x] 3.2 Implement the loop body: call `call_ollama`, inspect response for `message.tool_calls`
- [x] 3.3 If response has `tool_calls`: create `oneshot::channel`, store `tx` in `AgentState`, emit `agent-approval-needed` with command string, await `rx`
- [x] 3.4 If approved: run command via `tokio::task::spawn_blocking(|| std::process::Command::new("powershell").args(["-Command", &cmd]).output())`; collect stdout+stderr; emit `agent-tool-ran`; append tool result message to history; loop again
- [x] 3.5 If rejected: append tool result message with "User rejected the command."; loop again (Ollama responds to rejection)
- [x] 3.6 If response has no tool calls: append assistant message to history; emit `agent-message` with content; emit `agent-done`; break loop
- [x] 3.7 On any `reqwest` error: emit `agent-message` with human-readable error; emit `agent-done`; break loop
- [x] 3.8 Implement `agent_approve`: take `approval_tx` from `AgentState`; send the bool; return error if no pending approval

## 4. Wire Up in Tauri

- [x] 4.1 Add `mod agent;` to `src-tauri/src/lib.rs`
- [x] 4.2 Register `AgentState::default()` via `.manage(Mutex::new(AgentState::default()))` in `lib.rs`
- [x] 4.3 Add `agent_start` and `agent_approve` to `tauri::generate_handler![]` in `lib.rs`

## 5. Settings Modal

- [x] 5.1 Add `ollamaUrl` and `ollamaModel` state fields to `SettingsModal.tsx`
- [x] 5.2 On mount, read `ollama_url` and `ollama_model` from SQLite; fall back to default placeholder values if absent
- [x] 5.3 Add labeled inputs for "Ollama URL" and "Ollama Model" to the modal UI
- [x] 5.4 On save, write both values to SQLite via `setSetting`

## 6. Chat Panel Rewrite

- [x] 6.1 Remove all PTY-related imports and logic from `ChatPanel.tsx` (`invoke("pty_write")`, `listen("pty-data-*")`, `waitForPtyId`, `useWorkspaceStore` PTY access)
- [x] 6.2 On submit: add user bubble; read `ollama_url` and `ollama_model` from SQLite; call `invoke("agent_start", { userMessage, ollamaUrl, ollamaModel })`; disable input
- [x] 6.3 Listen for `agent-message` event — append assistant bubble with content
- [x] 6.4 Listen for `agent-approval-needed` event — render approval widget (command display + Approve/Reject buttons)
- [x] 6.5 Approve button: call `invoke("agent_approve", { approved: true })`; replace widget with "Running…" indicator
- [x] 6.6 Reject button: call `invoke("agent_approve", { approved: false })`; dismiss widget
- [x] 6.7 Listen for `agent-tool-ran` event — append a monospace block showing command and output
- [x] 6.8 Listen for `agent-done` event — re-enable input field; clean up all event listeners

## 7. Verify

- [x] 7.1 Run `cargo build` in `src-tauri/` — zero errors
- [x] 7.2 Start Ollama locally with a tool-capable model (e.g., `ollama run llama3.1`)
- [x] 7.3 Launch the app with `npm run tauri dev`; send a plain question — verify LLM response appears in chat
- [x] 7.4 Ask the LLM to run a terminal command — verify approval widget appears
- [x] 7.5 Click Approve — verify command runs, output appears in chat, LLM responds with a follow-up
- [x] 7.6 Click Reject — verify LLM responds acknowledging the rejection
- [x] 7.7 Stop Ollama and send a message — verify a friendly error message appears instead of a crash
- [x] 7.8 Open Settings, set custom Ollama URL and model, save; verify chat uses the updated values
