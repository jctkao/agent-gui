## Context

全新桌面應用程式，以 wireframe（AI Workbench Wireframes.dc.html）為設計依據。專案目錄目前只有 wireframe 原始檔，尚無任何程式碼。

技術選擇的核心驅動力：右側 browser pane 必須能瀏覽任意外部網站——這排除了 `<iframe>`（受 X-Frame-Options 限制），需要 Tauri 2 的 multi-webview 能力。

## Goals / Non-Goals

**Goals:**
- 兩欄版面骨架可執行（chat left + workspace right）
- 分頁/分割模式切換可操作
- Browser overlay 機制驗證：真實外部網站可在 app 內顯示
- 其餘三種 pane（file、editor、terminal）有 placeholder UI
- SQLite 設定儲存可讀寫 API key

**Non-Goals:**
- 真正的 AI 對話（無 Claude API 呼叫）
- 功能性的檔案瀏覽器（非 scaffold 範疇）
- PTY Terminal（非 scaffold 範疇）
- Monaco/CodeMirror 程式碼編輯器（非 scaffold 範疇）
- 拖曳調整 split 分隔線大小（留待後續）

## Decisions

### 決策 1：Tauri 2 over Tauri 1

**選擇**：Tauri 2

**理由**：Tauri 2 提供 `WebviewBuilder` 可在單一 Window 內建立多個 Webview，且各自有獨立的 URL context——這是 browser overlay 的技術基礎。Tauri 1 沒有這個能力。

**替代方案考慮**：Electron——bundle size 太大（+100MB），排除。

---

### 決策 2：Browser Overlay 同步機制

**選擇**：React `ResizeObserver` + `getBoundingClientRect()` → Tauri invoke → Rust 端移動 Webview

```
React BrowserPane
  └─ useEffect: ResizeObserver 監聽 div 尺寸變化
       └─ invoke('browser_set_rect', { x, y, w, h })
            └─ Rust: window.add_child(webview).set_bounds(...)

切換 tab 時:
  hide: invoke('browser_hide')  → webview.set_visible(false)
  show: invoke('browser_show')  → webview.set_visible(true) + update rect
```

**風險**：Webview 永遠疊在 React UI 上層（z-order 固定），所以 browser pane 顯示時不能有浮動的 React UI 元素覆蓋其上方。設計上需確保 browser pane 啟動時 tabbar 等 chrome 不被 overlay 遮住。

---

### 決策 3：狀態管理用 Zustand

**選擇**：Zustand

**理由**：輕量（~1KB），API 簡單，不需要 boilerplate。此 app 的狀態結構不複雜（tabs array + active tab + mode）。

**替代方案**：Redux Toolkit——overkill；React Context——多層 props drilling 難維護。

---

### 決策 4：SQLite via tauri-plugin-sql

**選擇**：`tauri-plugin-sql` with SQLite feature

**理由**：使用者明確要求「像 SQLite 的檔案型 DB」。API key 和未來可能的對話歷史、設定都能放這裡。

**替代方案**：`tauri-plugin-store`（JSON 檔案）——對 API key 等敏感資料的結構化查詢較不方便；localStorage——不能跨 webview 共享，也不夠持久。

---

### 決策 5：版面用純 CSS Flexbox

**選擇**：CSS custom properties + Flexbox，不引入 CSS-in-JS

**理由**：wireframe 的色系已定義（`#e7e5df` 背景、`#2a2a28` 邊框、`#3b6ea5` 主色），用 CSS variables 對應即可。避免引入 Tailwind 或 styled-components 增加複雜度。

---

## Risks / Trade-offs

- **Webview z-order** → Browser overlay 永遠在最上層，無法被 React UI 蓋住。Mitigation：browser pane 顯示時，React 端的 dropdown/modal 等 floating UI 必須先關閉。

- **Rect 同步延遲** → ResizeObserver 是非同步的，快速調整視窗大小時 overlay 位置可能有一幀落差。Mitigation：加入 `requestAnimationFrame` debounce。

- **多平台 DPI 差異** → Tauri Webview 的座標是 logical pixels，需確認 `getBoundingClientRect()` 回傳的值在 Retina/高 DPI 螢幕上與 Rust 端一致。Mitigation：Tauri 2 的 `PhysicalPosition` 提供縮放補正 API。

- **Tauri 2 plugin 成熟度** → tauri-plugin-sql v2 仍在持續更新，API 可能有 breaking change。Mitigation：鎖定版本號。
