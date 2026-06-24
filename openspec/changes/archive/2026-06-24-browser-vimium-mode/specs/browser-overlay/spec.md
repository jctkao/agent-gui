## MODIFIED Requirements

### Requirement: overlay webview 完成整頁導航後 emit browser-url-changed 事件
每當 `browser-overlay` webview 完成整頁載入，Tauri SHALL emit `browser-url-changed` 事件至主視窗，payload 為目前頁面的 URL 字串。`about:blank` 不觸發此事件。此外，`on_page_load` callback SHALL 在同一 `PageLoadEvent::Finished` 事件中注入 Vimium 鍵盤處理腳本（`vimium.js`）。

#### Scenario: 整頁導航完成後 emit 事件
- **WHEN** browser overlay 完成整頁導航（page load finished）
- **THEN** 主視窗收到 `browser-url-changed` 事件，payload 為最終落地 URL

#### Scenario: about:blank 不觸發事件
- **WHEN** browser overlay 載入 `about:blank`（初始化時）
- **THEN** 主視窗不收到 `browser-url-changed` 事件，也不注入 Vimium 腳本

#### Scenario: Vimium 腳本在整頁載入後注入
- **WHEN** browser overlay 完成整頁導航（非 about:blank）
- **THEN** `on_page_load` callback 在 emit `browser-url-changed` 之後，透過 `wv.eval(include_str!("vimium.js"))` 注入 Vimium 鍵盤處理腳本
