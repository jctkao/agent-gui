## 1. 相依套件

- [x] 1.1 `npm install @xterm/xterm @xterm/addon-fit`
- [x] 1.2 `Cargo.toml` 加入 `wezterm-portable-pty`

## 2. 資料模型

- [x] 2.1 `workspace.ts`：`Pane` 加上 `shell?: "powershell" | "wsl"` 欄位
- [x] 2.2 `workspace.ts`：初始 tabs 改為 4 個（Browser、Files、Editor、Terminal with `shell: "powershell"`），Browser 為 active；移除 Editor 以外不需要調整的預設值

## 3. TabBar：關閉按鈕與 + Dropdown

- [x] 3.1 `TabBar`：props 加上 `onCloseTab: (id: string) => void`，每個 tab 按鈕內加上 × 關閉按鈕
- [x] 3.2 `WorkspacePanel`：串接 `closeTab` action 至 TabBar 的 `onCloseTab`
- [x] 3.3 `TabBar`：props 加上 `onAddTab: (type: PaneType, shell?: "powershell" | "wsl") => void`
- [x] 3.4 `TabBar`：+ 按鈕加上 `isDropdownOpen` local state，點擊展開
- [x] 3.5 `TabBar`：dropdown 顯示四個選項（網頁、檔案總管、PowerShell、bash (WSL)），各選項呼叫 `onAddTab`
- [x] 3.6 `TabBar`：點擊選單外部時關閉 dropdown（`useEffect` + `document.addEventListener("mousedown")`）
- [x] 3.7 `WorkspacePanel`：`onAddTab` handler 呼叫 `addTab`（terminal 類型帶入對應 `shell`，label 為「PowerShell」或「bash (WSL)」）

## 4. WorkspacePanel 渲染策略

- [x] 4.1 `WorkspacePanel`：terminal tabs 全部保持 mount；active terminal 用 `position: relative, visibility: visible`，inactive terminal 用 `position: absolute, visibility: hidden, inset: 0`
- [x] 4.2 `WorkspacePanel`：非 terminal pane 維持原有行為（只 render active tab）
- [x] 4.3 `WorkspacePanel`：無 tab 時 pane container 顯示空白（不 render 任何 pane）

## 5. Rust PTY 後端

- [x] 5.1 `src-tauri/src/pty.rs`：定義 `PtySession`（master writer + child handle）和 `PtyManager`（`Mutex<HashMap<String, PtySession>>`）
- [x] 5.2 `pty.rs`：`pty_create(shell: String, app: AppHandle, state: State<PtyManager>) → Result<String, String>`：偵測 shell 路徑（PowerShell: 先查 `pwsh.exe` 再 fallback `powershell.exe`；WSL: `wsl.exe -e bash`），啟動 PTY process，啟動 background thread 讀取輸出並 `app.emit("pty-data-{id}", bytes)`，回傳 UUID
- [x] 5.3 `pty.rs`：`pty_write(id: String, data: Vec<u8>, state: State<PtyManager>) → Result<(), String>`
- [x] 5.4 `pty.rs`：`pty_resize(id: String, rows: u16, cols: u16, state: State<PtyManager>) → Result<(), String>`
- [x] 5.5 `pty.rs`：`pty_kill(id: String, state: State<PtyManager>) → Result<(), String>`
- [x] 5.6 `lib.rs`：`manage(PtyManager::default())` 與 `invoke_handler` 註冊全部 `pty_*` commands

## 6. 前端 Terminal Registry

- [x] 6.1 `src/lib/terminalRegistry.ts`：`Map<string, Terminal>` + `getTerminal(id)` / `createTerminal(id)` / `destroyTerminal(id)` 函式

## 7. TerminalPane 真實實作

- [x] 7.1 `TerminalPane.tsx`：接收 `pane: Pane` 與 `isActive: boolean` props
- [x] 7.2 `TerminalPane.tsx`：`useEffect` on mount → `invoke("pty_create", { shell: pane.shell })` → 拿到 `ptyId`（存 `useRef`）→ `terminal.open(divRef.current)`，attach `FitAddon`，`fitAddon.fit()`
- [x] 7.3 `TerminalPane.tsx`：`listen("pty-data-{ptyId}")` → `terminal.write(data)`（cleanup 時 `unlisten`）
- [x] 7.4 `TerminalPane.tsx`：`terminal.onData(s => invoke("pty_write", { id: ptyId, data: [...new TextEncoder().encode(s)] }))`
- [x] 7.5 `TerminalPane.tsx`：`ResizeObserver` 監聽 container → `fitAddon.fit()` → `invoke("pty_resize", { id: ptyId, rows, cols })`
- [x] 7.6 `TerminalPane.tsx`：`useEffect([isActive])` → 當 `isActive` 變為 `true` 時 `fitAddon.fit()`
- [x] 7.7 `TerminalPane.tsx`：`useEffect` cleanup（unmount 時）→ `invoke("pty_kill", { id: ptyId })`

## 8. 錯誤處理

- [x] 8.1 `TerminalPane.tsx`：`pty_create` 失敗時（例如 WSL 未安裝）顯示錯誤文字於 terminal 區域，並呼叫 `closeTab(pane.id)`
