## 1. Rust Backend — 新增導航 Commands

- [x] 1.1 在 `browser.rs` 新增 `browser_back` command：取得 `browser-overlay` webview 並呼叫 `wv.eval("history.back()")`
- [x] 1.2 在 `browser.rs` 新增 `browser_forward` command：同上，執行 `history.forward()`
- [x] 1.3 在 `browser.rs` 新增 `browser_reload` command：同上，執行 `location.reload()`
- [x] 1.4 在 `lib.rs` 的 `invoke_handler!` 中註冊三個新 command

## 2. Rust Backend — URL 同步 Event

- [x] 2.1 在 `lib.rs` 的 `setup` 中取得 `app_handle` clone
- [x] 2.2 在 `WebviewBuilder` 上加 `.on_page_load()` 回調：當 `PageLoadEvent::Finished` 且 URL 不是 `about:blank` 時，呼叫 `app_handle.emit("browser-url-changed", url)`

## 3. React Frontend — URL Bar 事件監聽

- [x] 3.1 在 `BrowserPane.tsx` 的 `useEffect` 中加入 `listen("browser-url-changed", ...)` 監聽器，更新 `currentUrl` 和 `inputUrl` state
- [x] 3.2 確保 unlisten 在 cleanup function 中被呼叫（避免 memory leak）

## 4. React Frontend — 導航按鈕 UI

- [x] 4.1 在 URL bar 左側新增 ← 按鈕，點擊時 `invoke("browser_back")`
- [x] 4.2 在 URL bar 左側新增 → 按鈕，點擊時 `invoke("browser_forward")`
- [x] 4.3 在 URL bar 左側新增 ↺ 按鈕，點擊時 `invoke("browser_reload")`
- [x] 4.4 套用與現有 `goBtn` 相符的樣式
