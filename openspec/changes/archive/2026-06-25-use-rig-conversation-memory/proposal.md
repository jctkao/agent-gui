## Why

The agent's chat history is managed manually — cloned out of `AgentState`, passed as `&mut Vec<Message>` to `agent.chat()`, then written back. This is boilerplate that rig already handles internally via `InMemoryConversationMemory`.

## What Changes

- Replace `chat_history: Vec<Message>` in `AgentState` with `InMemoryConversationMemory` as a separate Tauri managed state
- Replace `agent.chat(message, &mut history)` with `agent.prompt(message).conversation("main").await`
- Add `.memory(memory.clone())` to the agent builder

## Capabilities

### New Capabilities

None. This is a pure code cleanup with no behavior changes.

### Modified Capabilities

None. No spec-level behavior changes.

## Impact

- `src-tauri/src/agent/state.rs`: remove `chat_history` field
- `src-tauri/src/agent/commands.rs`: remove lock/clone/write-back dance, update agent construction and invocation
- `src-tauri/src/lib.rs`: register `InMemoryConversationMemory` as Tauri managed state
