# settings-store Specification

## Purpose
定義應用程式的設定持久化：SQLite 資料庫初始化與 Anthropic API key 的讀寫。

## Requirements

### Requirement: SQLite 資料庫初始化
應用程式啟動時 SHALL 自動在 Tauri app data 目錄建立 SQLite 資料庫（`settings.db`），並確保 `settings` 資料表存在（key-value 結構）。

#### Scenario: 首次啟動自動建立 DB
- **WHEN** 應用程式首次啟動，`settings.db` 不存在
- **THEN** Tauri backend 自動建立資料庫與 `settings (key TEXT PRIMARY KEY, value TEXT)` 資料表，不拋出錯誤

#### Scenario: 重複啟動不覆蓋資料
- **WHEN** 應用程式在已有 `settings.db` 的情況下啟動
- **THEN** 使用既有資料庫，不重置或覆蓋現有資料

---

### Requirement: API Key 讀寫
應用程式 SHALL 提供設定介面讓使用者輸入 Anthropic API key，並以 `tauri-plugin-sql` 將其存入 SQLite。

#### Scenario: 儲存 API Key
- **WHEN** 使用者在設定頁面輸入 API key 並確認
- **THEN** API key 以 `key = 'anthropic_api_key'` 寫入 `settings` 資料表（upsert），操作成功後顯示確認訊息

#### Scenario: 讀取已儲存的 API Key
- **WHEN** 應用程式啟動，`settings` 資料表中有 `anthropic_api_key` 記錄
- **THEN** API key 在 app 啟動時被讀取並存入 React 狀態，設定頁面顯示 masked 格式（`sk-ant-****`）

#### Scenario: API Key 不存在時的處理
- **WHEN** `settings` 資料表中無 `anthropic_api_key` 記錄
- **THEN** 讀取操作回傳 `null`，應用程式不拋出錯誤，設定頁面顯示空的輸入欄

---

### Requirement: Ollama connection settings
The application SHALL store and retrieve `ollama_url` and `ollama_model` in the existing `settings` SQLite table, with default values applied when the keys are absent.

#### Scenario: Save Ollama URL
- **WHEN** the user enters a URL in the Ollama URL field and saves
- **THEN** the value SHALL be written to `settings` with `key = 'ollama_url'` (upsert)

#### Scenario: Save Ollama model
- **WHEN** the user enters a model name in the Ollama Model field and saves
- **THEN** the value SHALL be written to `settings` with `key = 'ollama_model'` (upsert)

#### Scenario: Read saved Ollama settings
- **WHEN** the Settings modal opens
- **THEN** it SHALL read `ollama_url` and `ollama_model` from the database
- **AND** populate the corresponding input fields with the stored values

#### Scenario: Ollama URL not yet set
- **WHEN** `ollama_url` is absent from the settings table
- **THEN** the Settings modal SHALL display `http://localhost:11434` as a placeholder
- **AND** the agent SHALL use `http://localhost:11434` as the default

#### Scenario: Ollama model not yet set
- **WHEN** `ollama_model` is absent from the settings table
- **THEN** the Settings modal SHALL display `llama3.2` as a placeholder
- **AND** the agent SHALL use `llama3.2` as the default
