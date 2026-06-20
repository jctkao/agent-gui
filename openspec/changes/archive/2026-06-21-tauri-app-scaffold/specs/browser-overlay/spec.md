## ADDED Requirements

### Requirement: Browser pane 能渲染任意外部網站
Browser pane SHALL 使用 Tauri 2 multi-webview（overlay）技術，在 workspace panel 的 browser tab 區域渲染真實的外部網站，不受 X-Frame-Options 或 CORS 限制。

#### Scenario: 開啟外部網站
- **WHEN** browser pane 為當前 active tab，且 React BrowserPane div 已掛載
- **THEN** Tauri overlay webview 定位於該 div 的 bounding rect，並載入指定 URL，顯示完整網站內容

#### Scenario: 預設 URL
- **WHEN** browser tab 首次被選中且無指定 URL
- **THEN** browser overlay 顯示空白頁或預設的歡迎畫面

---

### Requirement: Overlay 位置與 React 版面同步
Browser overlay webview 的位置與大小 SHALL 與 React BrowserPane placeholder div 保持同步，當視窗大小改變或 splitter 被拖曳時自動更新。

#### Scenario: 視窗 resize 後 overlay 更新
- **WHEN** 使用者拖曳 Tauri 視窗邊框改變視窗大小
- **THEN** browser overlay 的 bounding rect 在 100ms 內更新至新位置與尺寸

#### Scenario: Splitter 拖曳後 overlay 更新
- **WHEN** 使用者拖曳 chat/workspace 分隔線
- **THEN** browser overlay 隨 workspace panel 的新尺寸同步縮放

---

### Requirement: 切換 tab 時 overlay 顯示/隱藏
當 browser tab 不是 active tab 時，browser overlay webview SHALL 隱藏；當 browser tab 被選中時立即顯示。

#### Scenario: 切換離開 browser tab
- **WHEN** 使用者點擊 browser 以外的其他 tab
- **THEN** browser overlay webview 立即設為不可見（`set_visible(false)`），不遮擋其他 pane 的 UI

#### Scenario: 切換回 browser tab
- **WHEN** 使用者點擊 browser tab
- **THEN** browser overlay webview 更新至目前 BrowserPane div 的位置後設為可見

---

### Requirement: Rust 端 browser_overlay commands
Tauri SHALL 暴露以下 commands 供 React 端呼叫：

- `browser_open(url: String)` — 建立或重用 overlay webview 並載入 URL
- `browser_set_rect(x: f64, y: f64, w: f64, h: f64)` — 更新 overlay 的位置與大小
- `browser_show()` — 顯示 overlay
- `browser_hide()` — 隱藏 overlay

#### Scenario: invoke browser_set_rect
- **WHEN** React 端呼叫 `invoke('browser_set_rect', { x, y, w, h })`
- **THEN** Rust 端在同一 Window 內調整 browser webview 的 bounds，無錯誤回傳

#### Scenario: invoke browser_hide 後其他 pane 可點擊
- **WHEN** `browser_hide` 被呼叫後
- **THEN** browser overlay 不再攔截滑鼠事件，其他 pane 的 UI 元素可正常互動
