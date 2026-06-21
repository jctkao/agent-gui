# AI Workbench

以 AI 對話驅動的桌面工作台。左側與 AI 對話，右側根據對話動態開啟網頁、檔案、程式碼編輯器或 Terminal。

## 畫面預覽

設計稿參見 `AI Workbench Wireframes.dc.html`（於瀏覽器開啟，需與 `support.js` 同目錄）。

```
┌─ AI Workbench ──────────────────────────────────────────────────────┐
│  ● ● ●  AI Workbench                                          ⚙     │
├──────────────────┬──────────────────────────────────────────────────┤
│                  │  [Browser ×][Files ×][Editor ×][Terminal ×] [+]  │
│   ✦ AI 助理      │──────────────────────────────────────────────────│
│                  │                                                   │
│  > 使用者訊息    │         工作區 Pane                               │
│  AI 回覆...      │   （網頁 / 檔案樹 / 程式碼 / 終端機）             │
│  [↗ 已開啟檔案] │                                                   │
│                  │                                                   │
│  [輸入訊息…] [↑] │                                                   │
└──────────────────┴───────────────────────────────────────────────────┘
```

## 技術棧

| 層級 | 技術 |
|------|------|
| 桌面框架 | Tauri 2 |
| 前端 | React 18 + TypeScript + Vite |
| 狀態管理 | Zustand |
| 終端機 | xterm.js + @xterm/addon-fit |
| 後端 | Rust |
| PTY | portable-pty（wezterm，支援 Windows ConPTY） |
| 資料庫 | SQLite（tauri-plugin-sql） |

## 前置需求

- **Node.js** 18+
- **Rust toolchain** — 安裝 [rustup](https://rustup.rs)
  ```bash
  # Windows（使用 winget）
  winget install Rustlang.Rustup
  ```
- **WebView2 Runtime**（Windows 通常已內建）
- **WSL**（選用）— 若要使用 bash (WSL) terminal

## 開始開發

```bash
# 安裝前端依賴（第一次）
npm install

# 啟動開發模式（首次執行需要編譯 Rust，約 2 分鐘）
npm run tauri dev
```

## 可用指令

```bash
npm run dev          # 只啟動 Vite 前端（不含 Rust）
npm run tauri dev    # 完整開發模式（Tauri + React）
npm run tauri build  # 打包為可執行檔
npx tsc --noEmit     # TypeScript 型別檢查
```

## 工作區 Pane 類型

右側工作區支援四種 pane，可在**分頁模式**（一次一個）或**分割模式**（多個並排）下使用：

| Pane | 說明 | 狀態 |
|------|------|------|
| Browser | 內嵌真實網頁瀏覽器（Tauri multi-webview） | 完整實作 |
| Files | 專案檔案樹 | 骨架完成 |
| Editor | 程式碼編輯器 | 骨架完成 |
| Terminal | 真實 PTY terminal（PowerShell / bash WSL） | 完整實作 |

分頁列支援動態新增（`+` 按鈕展開選單）與關閉（`×` 按鈕）。所有分頁關閉後工作區顯示空白。

## Browser Pane 實作說明

Browser pane 無法使用 `<iframe>`（大多數網站設有 `X-Frame-Options: DENY`）。解決方案是透過 Tauri 2 的 **multi-webview** 機制，在主視窗內疊加第二個 WebView，並與 React 的 placeholder `<div>` 位置即時同步：

```
React BrowserPane (透明 div)
  └─ ResizeObserver → getBoundingClientRect()
       └─ invoke("browser_set_rect") → Rust 調整 WebView 位置
```

因為 browser overlay 是原生 OS 視窗，永遠覆蓋所有 HTML 元素，切換 tab 或開啟 `+` 下拉選單時都會先呼叫 `browser_hide`。

## Terminal Pane 實作說明

Terminal pane 使用 **xterm.js** 渲染終端機 UI，後端透過 Rust 的 **portable-pty** crate 管理 PTY process：

```
xterm.js (前端渲染)
  ├─ onData → invoke("pty_write")  → Rust PTY master stdin
  └─ listen("pty-data-{id}")       ← Rust background thread 讀取 PTY 輸出

FitAddon: ResizeObserver → fitAddon.fit() → invoke("pty_resize")
```

- 支援 **PowerShell**（優先使用 `pwsh.exe`，fallback `powershell.exe`）
- 支援 **bash (WSL)**（`wsl.exe -e bash`）
- 切換到其他 tab 時，terminal 保持 DOM mounted（CSS `visibility: hidden`），PTY session 持續執行
- 關閉 tab 時，React unmount 觸發 `pty_kill`，終止 shell process

## 設定

點擊右上角 ⚙ 圖示，輸入 Anthropic API Key。設定儲存於本機 SQLite（`~/.local/share/ai-workbench/settings.db`），不會傳送至任何伺服器。

## 專案結構

```
├── src/                          # React 前端
│   ├── App.tsx                   # 根版面（TitleBar + ResizableSplitter）
│   ├── index.css                 # CSS 設計 tokens（顏色、圓角等）
│   ├── store/workspace.ts        # Zustand 全域狀態（tabs、activeTabId、mode）
│   ├── lib/
│   │   ├── settings.ts           # SQLite 設定讀寫
│   │   └── terminalRegistry.ts   # xterm.js 實例 Map（ptyId → Terminal）
│   └── components/
│       ├── layout/               # TitleBar、ResizableSplitter
│       ├── chat/                 # ChatPanel
│       ├── settings/             # SettingsModal
│       └── workspace/            # WorkspacePanel、TabBar、SplitLayout、panes/
├── src-tauri/                    # Rust 後端
│   ├── src/
│   │   ├── lib.rs                # 插件初始化、PTY state、command 註冊
│   │   ├── pty.rs                # PTY session 管理（create/write/resize/kill）
│   │   └── commands/browser.rs   # browser_open / set_rect / show / hide
│   ├── tauri.conf.json           # 視窗設定（1280×800、無裝飾）
│   └── capabilities/             # Tauri 2 權限設定
└── AI Workbench Wireframes.dc.html  # 設計稿
```

## 授權

MIT
