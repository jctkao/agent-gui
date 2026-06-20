## Why

目前只有 wireframe（AI Workbench Wireframes.dc.html），需要將其實作為可執行的桌面應用程式。選擇 Tauri 2 是因為它能同時支援真正的瀏覽器 pane（multi-webview）與原生 OS 整合（檔案系統、Terminal PTY），並以 Rust 作為後端確保安全性。

## What Changes

- 初始化 Tauri 2 + React 18 + TypeScript + Vite 專案結構
- 實作兩欄式版面：左側 AI 對話欄、右側工作區
- 右側工作區支援「分頁模式」與「分割模式」切換
- 實作四種 pane 類型的框架（browser、file、editor、terminal）
- **Browser pane**：使用 Tauri 2 multi-webview overlay，實現真實網站瀏覽
- 整合 `tauri-plugin-sql`（SQLite）作為設定儲存（API key 等）
- 建立 Rust 端 `browser_overlay` command，驗證 webview overlay 技術可行性

## Capabilities

### New Capabilities

- `app-shell`: 兩欄版面骨架（左側 chat panel、右側 workspace panel），支援分頁/分割模式切換與可拖曳分隔線
- `browser-overlay`: Tauri 2 multi-webview 機制，讓 browser pane 能真正渲染任意外部網站；React 端同步 overlay 位置
- `workspace-panes`: 四種 pane 類型（browser、file、editor、terminal）的框架與狀態管理（Zustand）
- `settings-store`: SQLite 為基礎的設定儲存，初始支援 API key 的讀寫

### Modified Capabilities

（無，全新專案）

## Impact

- **新增依賴**：`@tauri-apps/api` v2、`zustand`、`tauri-plugin-sql`、`tauri-plugin-fs`
- **Rust crates**：`tauri` v2、`tauri-plugin-sql`（sqlite feature）、`serde`、`serde_json`
- **開發環境需求**：Rust toolchain、Node.js、Tauri CLI v2
- **平台**：桌面（Windows / macOS / Linux），不含行動端
