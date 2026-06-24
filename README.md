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

## AI 助理與 Terminal 整合

Chat Panel 連接本機 **Ollama** 模型，支援工具呼叫（tool calling）：

1. 使用者輸入任務（例如「列出目前目錄的檔案」）
2. AI 決定要執行的 terminal 指令，傳送到 Terminal pane 並**暫停等待**
3. 使用者可選擇確認執行或取消
4. Terminal 輸出自動擷取並回傳給 AI，AI 繼續推理
5. 重複直到任務完成

AI 僅能透過 terminal 執行指令，無法直接存取檔案系統或網路。

## Browser Pane 鍵盤快捷鍵（Vimium 風格）

Browser pane 支援 Vimium 風格的鍵盤操作。有三種模式：

- **Normal mode**（預設）— 以下快捷鍵生效
- **Hint mode**（按 `f` 進入）— 頁面所有連結顯示字母標籤，輸入標籤即可點擊
- **Insert mode**（聚焦在輸入框時自動進入）— 所有鍵讓給頁面

| 按鍵 | 功能 |
|------|------|
| `j` / `k` | 向下 / 向上捲動 |
| `d` / `u` | 向下 / 向上半頁 |
| `gg` | 跳到頁首 |
| `G` | 跳到頁尾 |
| `H` / `L` | 上一頁 / 下一頁 |
| `r` | 重新整理 |
| `f` | 顯示連結提示（輸入字母點擊）|
| `Esc` | 取消 Hint mode / 離開 Insert mode |
| `Backspace`（Hint mode）| 刪除上一個輸入字元 |

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

點擊右上角 ⚙ 圖示，設定：

| 項目 | 說明 | 預設值 |
|------|------|--------|
| Anthropic API Key | 備用欄位（目前 AI 使用 Ollama） | — |
| Ollama URL | 本機 Ollama 伺服器位址 | `http://localhost:11434` |
| Ollama Model | 使用的模型名稱 | `llama3.2` |

設定儲存於本機 SQLite（`settings.db`），不會傳送至外部伺服器。

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
│       ├── chat/                 # ChatPanel（Ollama 整合 + Terminal 橋接）
│       ├── settings/             # SettingsModal
│       └── workspace/            # WorkspacePanel、TabBar、SplitLayout、panes/
├── src-tauri/                    # Rust 後端
│   ├── src/
│   │   ├── lib.rs                # 插件初始化、state 管理、command 註冊
│   │   ├── pty.rs                # PTY session 管理（create/write/resize/kill）
│   │   ├── vimium.js             # Browser 鍵盤快捷鍵腳本（注入 overlay webview）
│   │   ├── commands/browser.rs   # browser_open / set_rect / show / hide
│   │   └── agent/                # Ollama agent loop + terminal tool 橋接
│   ├── tauri.conf.json           # 視窗設定（1280×800、無裝飾）
│   └── capabilities/             # Tauri 2 權限設定
└── AI Workbench Wireframes.dc.html  # 設計稿
```

## 授權

MIT
