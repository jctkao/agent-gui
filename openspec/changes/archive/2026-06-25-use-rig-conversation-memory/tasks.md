## 1. State and Registration

- [x] 1.1 Remove `chat_history: Vec<Message>` from `AgentState` in `state.rs`
- [x] 1.2 Register `InMemoryConversationMemory::new()` as Tauri managed state in `lib.rs`

## 2. Agent Command Refactor

- [x] 2.1 In `commands.rs`, retrieve `InMemoryConversationMemory` from Tauri state instead of cloning `chat_history`
- [x] 2.2 Add `.memory(memory.clone())` to the agent builder in `run_agent`
- [x] 2.3 Replace `agent.chat(user_message, &mut history)` with `agent.prompt(user_message).conversation("main").await`
- [x] 2.4 Remove the post-call write-back of `history` into `AgentState`
- [x] 2.5 Update imports: remove `Chat`, add `Prompt` from `rig::completion`

## 3. Verify

- [x] 3.1 `cargo build` passes with no errors
- [ ] 3.2 Send a message, receive a response, send a follow-up that relies on prior context — confirm memory is working
