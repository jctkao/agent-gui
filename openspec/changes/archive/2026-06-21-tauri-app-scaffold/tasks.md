## 1. 專案初始化

- [x] 1.1 執行 `npm create tauri-app@latest` 建立 Tauri 2 + React + TypeScript + Vite 專案，設定 app name 為 `ai-workbench`
- [x] 1.2 安裝前端依賴：`zustand`、`@tauri-apps/api`
- [x] 1.3 加入 Tauri plugins：`tauri-plugin-sql`（SQLite feature）、`tauri-plugin-fs`
- [x] 1.4 設定 `tauri.conf.json`：`decorations: false`（自定義標題列）、初始視窗尺寸 1280×800、允許 plugin 所需 capabilities

## 2. SQLite 設定儲存（settings-store）

- [x] 2.1 在 `src-tauri/src/lib.rs` 初始化 `tauri-plugin-sql`，app 啟動時執行 `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`
- [x] 2.2 建立 Tauri command `get_setting(key: String) -> Option<String>` 與 `set_setting(key: String, value: String)`
- [x] 2.3 在 React 建立 `src/lib/settings.ts`：封裝 `getSetting` / `setSetting` invoke 呼叫
- [x] 2.4 建立 `src/components/settings/SettingsModal.tsx`：含 API key 輸入欄（masked）與儲存按鈕，使用 `settings.ts` 讀寫

## 3. App Shell 版面骨架（app-shell）

- [x] 3.1 建立 `src/App.tsx`：全螢幕 flexbox 容器，垂直排列自定義 titlebar + 主內容區
- [x] 3.2 建立 `src/components/layout/TitleBar.tsx`：三個圓形按鈕（使用 Tauri `Window.close/minimize/toggleMaximize`）+ "AI Workbench" 標題，`data-tauri-drag-region` 屬性啟用拖曳
- [x] 3.3 建立 `src/components/layout/ResizableSplitter.tsx`：水平拖曳分隔線，左側最小寬度 260px
- [x] 3.4 建立 `src/components/chat/ChatPanel.tsx`：左欄骨架，含頂部標題列（✦ AI 助理）、訊息列表區（靜態假 messages）、底部輸入框
- [x] 3.5 設定 CSS 變數（`--bg: #e7e5df`、`--border: #2a2a28`、`--accent: #3b6ea5` 等）對應 wireframe 色系

## 4. 工作區 Pane 狀態管理（workspace-panes）

- [x] 4.1 建立 `src/store/workspace.ts`（Zustand）：定義 `WorkspaceState`，包含 `mode: 'tab'|'split'`、`tabs: Pane[]`、`activeTabId: string`
- [x] 4.2 初始化預設 tabs：browser（`https://react.dev`）、file、editor、terminal

## 5. 工作區 Pane UI（workspace-panes）

- [x] 5.1 建立 `src/components/workspace/WorkspacePanel.tsx`：根據 `mode` 渲染 TabLayout 或 SplitLayout
- [x] 5.2 建立 `src/components/workspace/TabBar.tsx`：渲染 tabs、active 狀態樣式、模式切換按鈕（分頁/分割 toggle）
- [x] 5.3 建立 `src/components/workspace/panes/FilePane.tsx`：靜態檔案樹骨架
- [x] 5.4 建立 `src/components/workspace/panes/EditorPane.tsx`：行號 gutter + 程式碼骨架列
- [x] 5.5 建立 `src/components/workspace/panes/TerminalPane.tsx`：深色背景 + `$ ` prompt + 游標閃爍
- [x] 5.6 建立 `src/components/workspace/SplitLayout.tsx`：固定三窗格（browser 左、file 右上、terminal 右下）

## 6. Browser Overlay（browser-overlay）

- [x] 6.1 在 `src-tauri/Cargo.toml` 確認支援 multi-webview（Tauri 2 預設支援）
- [x] 6.2 建立 `src-tauri/src/commands/browser.rs`：實作 `browser_open(url, x, y, w, h)`、`browser_set_rect(x, y, w, h)`、`browser_show()`、`browser_hide()` 四個 commands，使用 `WebviewBuilder` 建立/管理 overlay webview
- [x] 6.3 在 `lib.rs` 註冊 browser commands 並用 `Mutex<Option<WebviewId>>` 管理 overlay webview 的生命週期
- [x] 6.4 建立 `src/components/workspace/panes/BrowserPane.tsx`：含 URL 輸入列、佔位 div（`ref` + `ResizeObserver`），掛載時 invoke `browser_open`，卸載時 invoke `browser_hide`
- [x] 6.5 在 `BrowserPane` 加入 `ResizeObserver` + `requestAnimationFrame` debounce，視窗 resize 時 invoke `browser_set_rect`
- [x] 6.6 在 `WorkspacePanel` tab 切換邏輯中，切換離開 browser tab 時 invoke `browser_hide`，切換回來時 invoke `browser_show` + `browser_set_rect`
- [x] 6.7 驗證：在 app 內開啟 `https://react.dev`，確認外部網站正確渲染，切換 tab 時 overlay 正確顯示/隱藏
