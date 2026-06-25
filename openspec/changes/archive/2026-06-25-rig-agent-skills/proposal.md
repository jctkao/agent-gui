## Why

目前的 agent 後端是手刻的 Ollama 整合：tool schema 硬編碼在 JSON 裡、tool dispatch 邏輯散落在 run_loop 中，每新增一個 tool 就要改多處。引入 rig.rs 框架和 Agent Skills 標準格式，讓 tool 定義結構化、skills 可插拔、未來切換 LLM provider 也不需要大改。

## What Changes

- 移除 `agent/ollama.rs` 的手刻 reqwest 呼叫，改用 `rig-core` Ollama provider
- 移除 `agent/commands.rs` 的手動 tool dispatch loop，改由 rig Agent 接管
- 新增 `agent/skills.rs`：啟動時掃描 `~/.agent-skills/`，解析 SKILL.md frontmatter，建構 system prompt 的 skill 列表
- 新增 `agent/tools/terminal.rs`：TerminalTool（需 user approve，透過 Tauri event + oneshot channel）
- 新增 `agent/tools/skill_loader.rs`：LoadSkillTool（讀取完整 SKILL.md body，不需 approve）
- `AgentState` 保留 `messages` 和 `approval_tx`，移除已不需要的欄位

## Capabilities

### New Capabilities

- `agent-skills-loader`: 掃描 `~/.agent-skills/` 目錄，parse SKILL.md frontmatter，實作 progressive disclosure（啟動時只載 name+description，agent 需要時再載完整 body）
- `rig-agent`: 以 rig.rs 框架驅動 agent loop，管理 tool registration 與 multi-turn conversation history

### Modified Capabilities

## Impact

- **Cargo.toml**: 新增 `rig-core`（with ollama feature）依賴
- **src-tauri/src/agent/**: 大幅改寫，新增 `skills.rs` 和 `tools/` 子目錄
- **src-tauri/src/lib.rs**: 啟動時初始化 SkillManager 並放入 Tauri managed state
- **不影響前端**：Tauri event 介面（`agent-message`, `agent-done`, `agent-command-to-terminal`）維持不變
