## Context

`run_agent` in `commands.rs` currently manages conversation history manually: it clones `chat_history` out of `AgentState`, passes it to `agent.chat()` which mutates it, then writes it back. `InMemoryConversationMemory` is rig's built-in equivalent — an Arc-backed, thread-safe HashMap keyed by conversation ID that rig loads/appends automatically per turn.

## Goals / Non-Goals

**Goals:**
- Remove the lock/clone/write-back boilerplate in `run_agent`
- Let rig own history management via `InMemoryConversationMemory`

**Non-Goals:**
- Multiple conversation threads (single `"main"` conversation ID)
- Persistent history across app restarts
- Truncation/summarization (available via `with_filter` but not needed now)

## Decisions

**Store `InMemoryConversationMemory` as separate Tauri managed state (not inside `AgentState`)**

`InMemoryConversationMemory` is Arc-backed and already handles its own concurrency. Storing it separately avoids going through the `Mutex<AgentState>` lock just to read the memory handle. `AgentState` can then hold only what it needs: `approval_tx`.

**Use `.prompt().conversation("main")` with hardcoded `"main"` ID**

This is a refactor, not a feature addition. A single conversation ID keeps the change minimal. If multi-session is needed later, the conversation ID can be threaded from the frontend at that point.

## Risks / Trade-offs

- **Same data loss on restart** — `InMemoryConversationMemory` is in-process only, same as the current `Vec<Message>`. No regression.
- **API change: `.chat()` → `.prompt().conversation()`** — rig's `Chat` trait is no longer used; the `Prompt` trait is used instead. Both are in scope via `rig::completion`.
