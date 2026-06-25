# Spec: Agent Skills Loader

## Purpose

Scan the `~/.agent-skills/` directory on startup, parse skill metadata from each `SKILL.md` frontmatter, and expose a `load-skill` tool for agents to fetch full skill content on demand.

## Requirements

### Requirement: 啟動時掃描 Skills 目錄

系統啟動時，自動掃描 `~/.agent-skills/` 目錄（若不存在則靜默忽略），解析每個子目錄內的 `SKILL.md` frontmatter（`name` 和 `description` 欄位）。

#### Scenario: 正常掃描

- **WHEN** 應用程式啟動，`~/.agent-skills/` 存在且含有合法 skill 資料夾
- **THEN** SkillManager 載入所有 skill 的 name + description，並建構 system prompt 列表字串

#### Scenario: 目錄不存在

- **WHEN** `~/.agent-skills/` 不存在
- **THEN** SkillManager 初始化成功，skill 列表為空，不影響 agent 啟動

#### Scenario: SKILL.md 格式錯誤

- **WHEN** 某個 skill 資料夾的 SKILL.md 缺少必要欄位（name 或 description）
- **THEN** 該 skill 被跳過，記錄 warning，其他 skill 正常載入

---

### Requirement: Progressive Disclosure — 按需載入完整內容

Agent 透過 `load-skill` tool 來取得完整 SKILL.md body（frontmatter 之後的 Markdown 內容）。

#### Scenario: 載入成功

- **WHEN** Agent 呼叫 `load-skill` tool，傳入合法的 skill name
- **THEN** 回傳該 skill 的完整 SKILL.md 內容（不含 frontmatter）

#### Scenario: Skill 不存在

- **WHEN** Agent 呼叫 `load-skill`，傳入不存在的 skill name
- **THEN** 回傳錯誤訊息，agent loop 繼續（不中斷）
