## Context

Browser pane 使用 Tauri 2 multi-webview overlay 架構：React UI 負責 URL bar 和外框，實際瀏覽器內容是一個獨立的 `browser-overlay` child webview（WebView2）。兩個 webview 互相隔離，React 無法直接讀取 overlay 的導航狀態。

目前 `browser_open` 是唯一的導航 command，每次都透過 `wv.navigate()` 跳到新 URL，沒有 back/forward/reload 機制，且 URL bar 只反映 React state（使用者手動輸入），不會跟著 overlay 的實際 URL 更新。

## Goals / Non-Goals

**Goals:**
- 新增 Back / Forward / Reload 三個按鈕到 URL bar 左側
- 整頁導航（full-page navigation）完成後，URL bar 自動顯示目前 URL
- Back/Forward/Reload 透過 Tauri command 觸發

**Non-Goals:**
- SPA 內部 `history.pushState()` 的 URL 同步（頁面不重載，on_page_load 不觸發）
- Back/Forward 按鈕的 disabled 狀態追蹤（無標準 API 可查詢 history 位置）
- 書籤、分頁歷史記錄等功能

## Decisions

### 1. URL 同步：`on_page_load` 回調 vs 其他方式

**決定**：在 `WebviewBuilder` 上掛 `on_page_load`，事件為 `Finished` 時 emit `browser-url-changed` 給主視窗。

**考慮的替代方案**：
- **JS 注入監聽器**：每次 navigate 後 eval 一段 JS 監聽 `load` 事件。問題：頁面重新載入後注入的監聽器消失，需要重新注入，且時序難以保證。
- **Polling**：定期 eval `window.location.href` 比對。簡單但浪費資源，有延遲感。
- **`on_navigation`（導航前）**：在導航開始前得到 URL，但 HTTP redirect 後最終 URL 可能不同，且頁面尚未完成載入。

`on_page_load(Finished)` 是最可靠的單一觸發點，URL 是最終落地 URL，無需額外機制。

### 2. Back / Forward / Reload：`eval()` vs 原生 API

**決定**：使用 `wv.eval("history.back()")` 等 JS。

**考慮的替代方案**：
- **Tauri Webview 原生方法**：Tauri 2 的 `Webview` 型別目前未暴露 `go_back()`、`go_forward()` 等方法（不在公開 API 中）。
- **WebView2 COM 介面**：可以直接呼叫 WebView2 的 `GoBack()` 等方法，但需要 Windows-only unsafe code，過度複雜。

`eval()` 是跨平台、最簡單的方式，行為等同使用者在 devtools 執行。

### 3. 過濾 `about:blank` 事件

`on_page_load` 在 webview 初始化（載入 `about:blank`）時也會觸發。在回調中過濾掉 `url == "about:blank"` 避免 URL bar 顯示空白頁網址。

## Risks / Trade-offs

- **SPA 導航不同步**：React SPA、Next.js 等使用 `pushState` 切換路由時，URL bar 不更新。這是已知限制，可接受（使用者仍可手動更新）。後續可透過注入 `popstate` 監聽器改善。
- **`eval()` 在 WebView2 的時序**：若 webview 尚未完全初始化就呼叫 `eval()`，命令可能靜默失敗。實際上 button 只有在 overlay 已顯示（`browser_open` 成功後）才可點擊，時序問題機率低。
- **`on_page_load` 多次觸發**：某些網站（iframe、重定向鏈）可能觸發多次 `Finished`，導致 URL bar 閃爍更新多次。影響不大，最終結果仍正確。
