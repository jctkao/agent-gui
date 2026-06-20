# AI Workbench

以 AI 對話驅動的桌面工作台。左側與 AI 對話，右側根據對話動態開啟網頁、檔案、程式碼編輯器或 Terminal。

## 畫面預覽

設計稿參見 `AI Workbench Wireframes.dc.html`（於瀏覽器開啟，需與 `support.js` 同目錄）。

```
┌─ AI Workbench ─────────────────────────────────────────────────┐
│  ● ● ●  AI Workbench                                    ⚙      │
├──────────────────┬─────────────────────────────────────────────┤
│                  │  [Browser] [Files] [Editor] [Terminal]  [分頁|分割] │
│   ✦ AI 助理      │─────────────────────────────────────────────│
│                  │                                             │
│  > 使用者訊息    │         工作區 Pane                          │
│  AI 回覆...      │   （網頁 / 檔案樹 / 程式碼 / 終端機）        │
│  [↗ 已開啟檔案] │                                             │
│                  │                                             │
│  [輸入訊息…] [↑] │                                             │
└──────────────────┴─────────────────────────────────────────────┘
```

## 技術棧

| 層級 | 技術 |
|------|------|
| 桌面框架 | Tauri 2 |
| 前端 | React 18 + TypeScript + Vite |
| 狀態管理 | Zustand |
| 後端 | Rust |
| 資料庫 | SQLite（tauri-plugin-sql） |

## 前置需求

- **Node.js** 18+
- **Rust toolchain** — 安裝 [rustup](https://rustup.rs)
  ```bash
  # Windows（使用 winget）
  winget install Rustlang.Rustup
  ```
- **WebView2 Runtime**（Windows 通常已內建）

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
| Browser | 內嵌真實網頁瀏覽器（Tauri multi-webview） | 框架完成 |
| Files | 專案檔案樹 | 骨架完成 |
| Editor | 程式碼編輯器 | 骨架完成 |
| Terminal | 終端機 | 骨架完成 |

## Browser Pane 實作說明

Browser pane 無法使用 `<iframe>`（大多數網站設有 `X-Frame-Options: DENY`）。解決方案是透過 Tauri 2 的 **multi-webview** 機制，在主視窗內疊加第二個 WebView，並與 React 的 placeholder `<div>` 位置即時同步：

```
React BrowserPane (透明 div)
  └─ ResizeObserver → getBoundingClientRect()
       └─ invoke("browser_set_rect") → Rust 調整 WebView 位置
```

## 設定

點擊右上角 ⚙ 圖示，輸入 Anthropic API Key。設定儲存於本機 SQLite（`~/.local/share/ai-workbench/settings.db`），不會傳送至任何伺服器。

## 專案結構

```
├── src/                        # React 前端
│   ├── App.tsx                 # 根版面（TitleBar + ResizableSplitter）
│   ├── index.css               # CSS 設計 tokens（顏色、圓角等）
│   ├── store/workspace.ts      # Zustand 全域狀態
│   ├── lib/settings.ts         # SQLite 設定讀寫
│   └── components/
│       ├── layout/             # TitleBar、ResizableSplitter
│       ├── chat/               # ChatPanel
│       ├── settings/           # SettingsModal
│       └── workspace/          # WorkspacePanel、TabBar、SplitLayout、panes/
├── src-tauri/                  # Rust 後端
│   ├── src/
│   │   ├── lib.rs              # 插件初始化、SQLite migration
│   │   └── commands/browser.rs # browser_open / set_rect / show / hide
│   ├── tauri.conf.json         # 視窗設定（1280×800、無裝飾）
│   └── capabilities/           # Tauri 2 權限設定
└── AI Workbench Wireframes.dc.html  # 設計稿
```

## 授權

MIT
