## ADDED Requirements

### Requirement: Rust 端暴露 browser_back、browser_forward、browser_reload commands
Tauri SHALL 額外暴露以下 commands 供 React 端呼叫：

- `browser_back()` — 令 overlay webview 執行 `history.back()`
- `browser_forward()` — 令 overlay webview 執行 `history.forward()`
- `browser_reload()` — 令 overlay webview 執行 `location.reload()`

#### Scenario: invoke browser_back
- **WHEN** React 端呼叫 `invoke('browser_back')`
- **THEN** browser overlay 導航至上一頁，無錯誤回傳

#### Scenario: invoke browser_forward
- **WHEN** React 端呼叫 `invoke('browser_forward')`
- **THEN** browser overlay 導航至下一頁，無錯誤回傳

#### Scenario: invoke browser_reload
- **WHEN** React 端呼叫 `invoke('browser_reload')`
- **THEN** browser overlay 重新載入目前頁面，無錯誤回傳

---

### Requirement: overlay webview 完成整頁導航後 emit browser-url-changed 事件
每當 `browser-overlay` webview 完成整頁載入，Tauri SHALL emit `browser-url-changed` 事件至主視窗，payload 為目前頁面的 URL 字串。`about:blank` 不觸發此事件。

#### Scenario: 整頁導航完成後 emit 事件
- **WHEN** browser overlay 完成整頁導航（page load finished）
- **THEN** 主視窗收到 `browser-url-changed` 事件，payload 為最終落地 URL

#### Scenario: about:blank 不觸發事件
- **WHEN** browser overlay 載入 `about:blank`（初始化時）
- **THEN** 主視窗不收到 `browser-url-changed` 事件
