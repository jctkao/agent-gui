## 1. 驗證 rig Ollama Tool Calling（Spike）

- [x] 1.1 在 `Cargo.toml` 加入 `rig-core`，找出正確的 Ollama feature flag（查 docs.rs / crates.io）
- [x] 1.2 寫一個最小 spike：建立 rig Ollama client + 一個 dummy tool，呼叫 `agent.prompt()`，確認 tool call 有被觸發
- [x] 1.3 確認 rig 的 multi-turn API：如何把現有 `Vec<Value>` history 帶入 agent（查 rig 文件）
- [x] 1.4 執行 `cargo check` 確認無依賴衝突（特別是 tokio 版本）

## 2. SkillManager 實作

- [x] 2.1 新增 `src-tauri/src/agent/skills.rs`
- [x] 2.2 實作 `SkillMeta` struct（name, description, path）
- [x] 2.3 實作 `SkillManager::load(dir: PathBuf)`：掃描子目錄、parse SKILL.md frontmatter（用 `gray_matter` 或手動 parse YAML block）、錯誤的 skill 靜默跳過
- [x] 2.4 實作 `SkillManager::system_prompt_section()`：回傳 skill 列表字串
- [x] 2.5 實作 `SkillManager::load_skill_body(name: &str)`：讀取完整 SKILL.md（frontmatter 以下的部分）
- [x] 2.6 在 `lib.rs` 的 Tauri setup 中初始化 SkillManager，掃描 `~/.agent-skills/`，放入 managed state

## 3. Rig Tools 實作

- [x] 3.1 新增 `src-tauri/src/agent/tools/mod.rs`
- [x] 3.2 新增 `src-tauri/src/agent/tools/skill_loader.rs`：實作 `LoadSkillTool` struct（持有 `Arc<SkillManager>`），實作 rig Tool trait，呼叫 `load_skill_body()`
- [x] 3.3 新增 `src-tauri/src/agent/tools/terminal.rs`：實作 `TerminalTool` struct（持有 `AppHandle` + `Arc<Mutex<AgentState>>`），實作 rig Tool trait，emit `agent-command-to-terminal`，await oneshot receiver

## 4. Agent Commands 改寫

- [x] 4.1 更新 `agent/state.rs`：`AgentState` 保留 `chat_history: Vec<Message>` 和 `approval_tx`，移除已無用的欄位
- [x] 4.2 改寫 `agent/commands.rs` 的 `agent_start`：移除 `ollama.rs` 呼叫，改用 rig Ollama client，注入 skill system prompt、history、tools，呼叫 `agent.chat()`，結果 emit `agent-message` + `agent-done`
- [x] 4.3 確認 `agent_terminal_result` command 邏輯不需改動（oneshot send 邏輯不變）
- [x] 4.4 刪除 `agent/ollama.rs`（功能已由 rig 取代）
- [x] 4.5 更新 `agent/mod.rs` 的 pub 宣告

## 5. 整合測試

- [x] 5.1 在 `~/.agent-skills/` 建一個測試 skill 資料夾（含最小 SKILL.md）
- [x] 5.2 啟動 app，在 chat 發一則需要 skill 的訊息，確認 agent 呼叫 `load-skill` tool 並回應正確
- [x] 5.3 發一則需要執行指令的訊息，確認 terminal approve 流程正常（emit event → user approve → 結果回傳）
- [x] 5.4 確認多輪對話（歷史保留）正常運作
- [x] 5.5 測試 `~/.agent-skills/` 不存在時 app 仍正常啟動
