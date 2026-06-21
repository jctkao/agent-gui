## Context

目前 `TerminalPane.tsx` 是靜態骨架，`TabBar` 的 `+` 按鈕無任何行為，tab 無法關閉。這個 change 分兩條軸線：（1）讓 workspace tab 系統支援動態建立與關閉，（2）讓 terminal tab 對接真實的 PTY process。

## Goals / Non-Goals

**Goals:**
- Tab 可動態新增（Browser / 檔案總管 / PowerShell / bash(WSL)）與關閉
- Terminal tab 執行真實 shell，支援 PowerShell 與 WSL bash
- 切換 tab 時 terminal session 保持活著（背景繼續執行）

**Non-Goals:**
- Split mode 下的 terminal 支援（現階段不改 SplitLayout）
- Terminal session 的持久化（app 關閉後 session 不復原）
- 自訂 shell 路徑設定
- Terminal 顏色主題設定

## Decisions

### D1：Terminal tab 永遠保持 DOM mounted

**決定**：所有 terminal tab 的 `TerminalPane` 始終在 DOM 中，用 `visibility: hidden` + `position: absolute` 隱藏非 active 的。

**理由**：xterm.js 的 `Terminal.open(element)` 只能呼叫一次；`display: none` 讓容器尺寸歸零，`FitAddon` 無法計算 rows/cols。

**替代方案**：每次 mount 時重建 xterm instance，從 PTY buffer 回放輸出 — 複雜度高，且跨 tab 切換會有明顯閃爍。

---

### D2：xterm 實例用 module-level Map 管理，不放 Zustand

**決定**：`src/lib/terminalRegistry.ts` 維護 `Map<ptyId, Terminal>`，與 Zustand store 分離。

**理由**：xterm `Terminal` 物件含 DOM ref 與 event listener，不可序列化，放進 Zustand 會破壞其 immutability 假設。

**替代方案**：`useRef` per component — 但 terminal tab 是 workspace-level 概念，跨元件共享需要往上傳或用 context，增加耦合。

---

### D3：PTY 輸出透過 Tauri event（非輪詢）

**決定**：Rust 為每個 PTY session 啟動一條 background thread，讀到資料即 `app.emit("pty-data-{id}", bytes)`；前端 `listen()` 訂閱。

**理由**：terminal 輸出量不定，polling 有延遲且浪費 CPU。Tauri event 是 push model，延遲低。

---

### D4：Pane data model 以 `shell` + `ptyId` 擴充

```typescript
export interface Pane {
  id: string;
  type: PaneType;
  label: string;
  url?: string;
  shell?: "powershell" | "wsl";  // terminal 類型
  ptyId?: string;                 // 非同步建立後填入
}
```

Terminal tab 建立流程：先 addTab（ptyId 為 undefined），`TerminalPane` mount 後呼叫 `pty_create`，拿到 ptyId 後 patch 進 store 並開始 listen。

---

### D5：WorkspacePanel 渲染策略分流

```
if (tab.type === "terminal")
  → 所有 terminal tab 同時 render，active 用 position: static，inactive 用 position: absolute + visibility: hidden
else
  → 只 render active tab（現有行為）
```

Terminal 以外的 pane 沒有需要保留的 DOM 狀態，不需要 always-mounted。

---

### D6：Shell 偵測（Windows）

- PowerShell：先查 `where.exe pwsh`，有就用 `pwsh.exe`，否則 `powershell.exe`
- WSL bash：固定用 `wsl.exe -e bash`；若 WSL 未安裝，`pty_create` 回傳 error，前端顯示錯誤訊息並移除剛建立的 tab

## Risks / Trade-offs

- **WSL 未安裝** → `pty_create` 失敗 → tab 建立後立即關閉並顯示 toast 錯誤訊息
- **ConPTY 限制**：Windows 10 1903 以前無 ConPTY，`wezterm-portable-pty` 會 fallback 到 winpty（需額外 DLL）；目前用 Win 11 不受影響
- **Always-mounted terminal tab 的記憶體**：每個 xterm instance 持有一份 scrollback buffer（預設 1000 行），多 session 時記憶體用量線性成長。可接受，未來再加上限設定
- **Tab 關閉 race condition**：若 `pty_kill` 慢（shell 不回應），UI 已移除 tab 但 PTY thread 還在跑 → 以 ptyId 為 key，事件 listener 在 tab 移除時立即 unlisten，background thread 自然因 write 失敗而結束
