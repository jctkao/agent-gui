## ADDED Requirements

### Requirement: 用 rig.rs 驅動 Agent Loop

Agent 使用 `rig-core` 的 Ollama provider 和 Agent 型別，取代手刻的 reqwest + run_loop。

#### Scenario: 基本對話

- **WHEN** `agent_start` 被呼叫，傳入 user message、ollama url、model
- **THEN** rig Agent 以 system prompt（含 skill 列表）+ 對話歷史 建構 context，執行 prompt，並在收到最終回應後 emit `agent-message` 和 `agent-done` 事件

#### Scenario: Tool 呼叫

- **WHEN** Agent 在 loop 中決定呼叫某個 tool（load-skill 或 run-terminal-command）
- **THEN** rig 自動 dispatch 到對應的 tool 實作，取得回傳值後繼續 loop，直到 agent 產出最終文字回應

---

### Requirement: Terminal Tool 需要 User Approve

`run-terminal-command` tool 執行前必須等待使用者確認。

#### Scenario: 使用者核准

- **WHEN** Agent 呼叫 `run-terminal-command`
- **THEN** 後端 emit `agent-command-to-terminal` 事件到前端，等待前端呼叫 `agent_terminal_result`；核准後執行指令，將輸出回傳給 agent

#### Scenario: 使用者取消

- **WHEN** 前端呼叫 `agent_terminal_result` 且 `cancelled: true`
- **THEN** Tool 回傳取消訊息，agent loop 以此為 tool result 繼續，最終 emit `agent-done`

---

### Requirement: 對話歷史跨輪次保留

多次 `agent_start` 之間，對話歷史必須保留。

#### Scenario: 多輪對話

- **WHEN** 使用者連續發送多則訊息
- **THEN** 每次 `agent_start` 都帶入完整的歷史 messages，讓 agent 有完整的對話 context

#### Scenario: 對話重設

- **WHEN** 前端呼叫 `agent_clear`（或類似命令）
- **THEN** AgentState.messages 清空，下一輪從空白開始
