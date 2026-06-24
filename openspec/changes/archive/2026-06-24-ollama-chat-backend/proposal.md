## Why

The left chat panel currently bridges user input to a PTY terminal, acting as a command passthrough rather than an AI assistant. Connecting it to a real LLM (Ollama) makes it genuinely useful: users can have a natural language conversation with a local model, and the model can autonomously run terminal commands with user approval.

## What Changes

- The chat panel stops routing input through PTY and instead invokes a Rust-managed agentic loop
- A Rust backend module handles Ollama HTTP calls, conversation state, and tool execution
- Ollama connection settings (URL and model) are added to the existing settings store
- The Settings modal gains two new fields: Ollama URL and model name
- The chat panel gains an approval UI for tool calls proposed by the LLM

## Capabilities

### New Capabilities

- `ollama-agent`: Rust-backed agentic loop that calls Ollama, manages conversation history, handles tool calls, and awaits user approval before executing terminal commands

### Modified Capabilities

- `chat-terminal-bridge`: The chat panel's input/output behavior changes from PTY passthrough to LLM conversation with optional tool use
- `settings-store`: Two new keys added (`ollama_url`, `ollama_model`); Settings modal gains corresponding UI fields

## Impact

- **New Rust dependencies**: `reqwest` (HTTP client), `tokio` (async runtime features)
- **New Rust module**: `src-tauri/src/agent/` with commands `agent_start` and `agent_approve`
- **New Tauri events**: `agent-message`, `agent-approval-needed`, `agent-tool-ran`, `agent-done`
- **Frontend**: `ChatPanel.tsx` replaces PTY logic; `SettingsModal.tsx` adds two fields
- **No changes** to `pty.rs`, `settings.ts`, or the SQLite schema
