## Why

目前的 TerminalPane 只是靜態骨架，無法執行任何指令；使用者也無法動態新增或關閉分頁。這個 change 讓 workspace 的分頁系統真正可用：可以開/關任意 tab，並擁有能實際執行 shell 的 terminal session。

## What Changes

- 每個 terminal tab 對應一個真實的 PTY session（Rust backend），以 xterm.js 渲染於前端
- 支援 Windows PowerShell（`pwsh.exe` fallback `powershell.exe`）與 WSL bash（`wsl.exe -e bash`）
- TabBar 新增 × 關閉按鈕；全部關閉後 workspace 顯示空白
- TabBar 的 `+` 按鈕展開 dropdown，可選擇新增：網頁、檔案總管、PowerShell terminal、bash (WSL) terminal
- App 啟動預設四個 tab：Browser、Files、Editor、Terminal（PowerShell）
- Editor tab 不放入 `+` dropdown（關閉後無法從 dropdown 重開）
- Terminal tab 在切換時保持 DOM mounted（CSS visibility），避免 xterm 實例被銷毀

## Capabilities

### New Capabilities
- `terminal-session`: 真實 PTY terminal session 的前後端整合——xterm.js 渲染、Tauri IPC 指令（pty_create / pty_write / pty_resize / pty_kill）、Rust background thread 讀取 PTY 輸出並 emit 事件

### Modified Capabilities
- `workspace-panes`: Tab 新增動態建立（+ dropdown）、× 關閉按鈕、全關後空白狀態，以及 terminal tab 的 always-mounted 渲染策略

## Impact

- **前端相依**：新增 `@xterm/xterm`、`@xterm/addon-fit`
- **Rust 相依**：新增 `wezterm-portable-pty` crate
- **修改檔案**：`workspace.ts`（Pane model 擴充）、`WorkspacePanel.tsx`（渲染策略）、`TabBar.tsx`（× 按鈕 + dropdown）、`TerminalPane.tsx`（xterm.js 整合）
- **新增檔案**：`src-tauri/src/pty.rs`（PTY 指令與 session 管理）、`src/lib/terminalRegistry.ts`（xterm 實例 Map）
- **Windows 限制**：ConPTY 需要 Windows 10 1903+；WSL bash 需要使用者已安裝 WSL
