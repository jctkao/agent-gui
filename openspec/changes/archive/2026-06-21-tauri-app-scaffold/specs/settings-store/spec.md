## ADDED Requirements

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
