## Context

目前的 agent 後端（`src-tauri/src/agent/`）全部手刻：`ollama.rs` 用 reqwest 直打 Ollama API，`commands.rs` 手動解析 JSON tool_calls 並 dispatch，message history 存在 `Mutex<AgentState>` 裡。唯一的 tool 是 `run_terminal_command`，其 JSON schema 硬編碼在 `ollama.rs`。

這次引入兩個外部標準：
- **rig.rs** (`rig-core` crate)：Rust LLM agent 框架，提供 provider 抽象、tool trait、自動 tool loop
- **Agent Skills** (agentskills.io)：標準化的 skill 目錄格式（`SKILL.md` + optional scripts/references）

## Goals / Non-Goals

**Goals:**
- 用 rig Ollama provider 取代手刻 reqwest 呼叫
- 用 rig Agent 取代手刻 run_loop 和 tool dispatch
- 實作 SkillManager：掃描 `~/.agent-skills/`，實作 progressive disclosure
- 兩個 rig tools：`LoadSkillTool`（no approval）和 `TerminalTool`（needs approval）
- 前端 Tauri event 介面不變

**Non-Goals:**
- 支援 Ollama 以外的 LLM provider（rig 讓這變容易，但不在本次範圍）
- 動態新增/移除 skills（重啟才重新掃描）
- Skill scripts 的執行（agentskills.io 的 `scripts/` 目錄）
- rig 的 ConversationMemory / vector store 功能

## Decisions

### D1: Tool struct 持有 AppHandle + Arc<Mutex<AgentState>>

**問題**：rig 的 tool 是獨立 struct，但 TerminalTool 需要 emit Tauri event 和存取 oneshot channel sender。

**決定**：Tool struct 直接持有 `AppHandle`（Tauri 的 AppHandle 是 Clone）和 `Arc<Mutex<AgentState>>`。

```rust
struct TerminalTool {
    app: AppHandle,
    state: Arc<Mutex<AgentState>>,
}
```

**替代方案**：全域 static / once_cell — 較難測試，與 Tauri managed state 模式不一致，捨棄。

---

### D2: 對話歷史由 AgentState.messages 維護，不用 rig ConversationMemory

**問題**：rig 的 `agent.prompt()` 是 stateless，不跨呼叫保留歷史。

**決定**：保留 `AgentState.messages: Vec<Value>`。每次 `agent_start` 把 history 轉成 rig 的 `Message` 型別注入。rig Agent 每次重建（不長存）。

**替代方案**：rig ConversationMemory — 需要外部存儲，且與現有 Tauri state 整合複雜，對目前規模 overkill。

---

### D3: System prompt 包含 skill 列表；LoadSkillTool 實作 progressive disclosure

**問題**：agentskills.io 的 progressive disclosure 需要 agent 只在需要時才讀完整 SKILL.md。

**決定**：
- system prompt 結尾附上 skill 目錄（name + description）
- Agent 需要某 skill 時，呼叫 `load-skill` tool → 回傳完整 body
- LoadSkillTool 在呼叫時才讀檔，不預載

```
System prompt 格式：
...（base instructions）...

Available skills (use load-skill tool to activate):
- terminal-ops: 執行終端機指令的最佳實踐. Use when...
- code-review: 如何做 code review. Use when...
```

---

### D4: 先驗證 rig Ollama provider 的 tool calling 支援

**問題**：rig 有 Ollama provider，但不確定是否完整支援 `/api/chat` 的 `tools` 欄位。

**決定**：實作前先跑最小驗證 spike（加依賴 + 建一個帶 tool 的 Ollama agent + 測試 tool call 是否觸發）。若不支援，退回用 rig 的 `CompletionModel` trait 自訂實作。

---

### D5: TerminalTool 的 await 不阻塞 tokio runtime

**問題**：TerminalTool 的 `call()` 需要 await oneshot receiver（等 user approve），這在 rig 的 async tool loop 裡執行。

**決定**：這是正確的 async await，tokio runtime 在等待期間可以處理其他 task（包括 `agent_terminal_result` command）。無需特別處理。

## Risks / Trade-offs

- **rig Ollama tool calling 未驗證** → Mitigation: D4 的 spike 先做，若失敗有退路（自訂 CompletionModel）
- **rig-core 版本與 Tauri 依賴衝突**（tokio 版本、async runtime）→ Mitigation: 早期加依賴時確認 `cargo check` 通過
- **多輪對話的 history 格式轉換**：`Vec<Value>` (Ollama JSON) → rig 的 `Message` 型別 → 需要謹慎映射 role 欄位（user/assistant/tool）

## Open Questions

- rig-core 的確切 feature flag 名稱（`ollama`？還是其他？）— 查 Cargo.toml 或 docs.rs 確認
- rig 的 multi-turn API 是 `agent.prompt()` 帶 history 參數，還是另一個 method？— 查文件
