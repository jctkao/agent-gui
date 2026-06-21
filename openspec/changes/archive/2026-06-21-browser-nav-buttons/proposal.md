## Why

Browser pane 目前只有一個網址輸入欄，使用者無法在瀏覽歷史中前後移動，也無法重新載入頁面，且點擊連結後 URL bar 不會更新。加入 Back / Forward / Reload 按鈕並同步 URL bar，讓操作體驗接近正常瀏覽器。

## What Changes

- 在 URL bar 左側加入三個導航按鈕：← 上一頁、→ 下一頁、↺ 重新載入
- Rust 端新增三個 Tauri command：`browser_back`、`browser_forward`、`browser_reload`，透過 `eval()` 執行對應的 JS
- `lib.rs` 在建立 `browser-overlay` webview 時掛上 `on_page_load` 回調，每次整頁導航完成後 emit `browser-url-changed` 事件
- React `BrowserPane` 監聽 `browser-url-changed`，自動更新 URL bar 顯示的網址

## Capabilities

### New Capabilities

- `browser-navigation`: 瀏覽器導航按鈕（Back / Forward / Reload）及 URL bar 自動同步

### Modified Capabilities

- `browser-overlay`: 新增 `browser_back`、`browser_forward`、`browser_reload` commands；新增 `browser-url-changed` Tauri event

## Impact

- `src/components/workspace/panes/BrowserPane.tsx` — 新增三個按鈕、listen URL 事件
- `src-tauri/src/commands/browser.rs` — 新增三個 command
- `src-tauri/src/lib.rs` — WebviewBuilder 加 `on_page_load` 回調
- 無外部依賴異動
- 不影響其他 pane
